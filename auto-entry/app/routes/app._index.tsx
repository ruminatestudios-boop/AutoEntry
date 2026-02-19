import { useEffect, useState, useRef } from "react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate, useRouteError, useRevalidator } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Modal,
  TextField,
  FormLayout,
  EmptyState,
  InlineGrid,
  Tag,
  Grid,
  Thumbnail,
  AppProvider,
  Badge,
  Button,
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { QRCodeSVG } from "qrcode.react";
import { authenticate } from "../shopify.server";
import { PLAN_LIMITS } from "../core/constants";
import db from "../db.server";
import { DashboardPageLayout } from "../components/DashboardPageLayout";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  // Safety check: ensure the model exists on the client (requires server restart after schema changes)
  const shopSettingsModel = (db as any).shopSettings;

  let shopSettings: Awaited<ReturnType<typeof db.shopSettings.findUnique>> = null;
  let recentScans: any[] = [];

  const normalizeProductImageUrls = (product: any) => {
    if (!product) return null;
    if (typeof product.imageUrls === 'string') {
      try {
        product.imageUrls = JSON.parse(product.imageUrls);
      } catch (e) {
        product.imageUrls = [product.imageUrls];
      }
    }
    if ((!product.imageUrls || (Array.isArray(product.imageUrls) && product.imageUrls.length === 0)) && product.imageUrl) {
      if (typeof product.imageUrl === 'string' && product.imageUrl.startsWith('[')) {
        try {
          product.imageUrls = JSON.parse(product.imageUrl);
        } catch (e) {
          product.imageUrls = [product.imageUrl];
        }
      } else {
        product.imageUrls = [product.imageUrl];
      }
    }
    return (product.status === "DRAFT" || product.status === "PUBLISHED") ? product : null;
  };

  try {
    const [settingsResult, recentSessions] = await Promise.all([
      shopSettingsModel ? shopSettingsModel.findUnique({ where: { shop } }) : Promise.resolve(null),
      db.scanSession.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        where: {
          products: { some: {} }
        },
        include: { products: true }
      })
    ]);
    shopSettings = settingsResult ?? null;
    const rawList = (recentSessions || [])
      .flatMap((session: any) => (session.products || []).map(normalizeProductImageUrls))
      .filter((p: any) => p != null);
    recentScans = rawList.sort((a: any, b: any) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  } catch (dbError) {
    console.error("Dashboard loader: failed to load scan sessions/products:", dbError);
    try {
      shopSettings = shopSettingsModel ? await shopSettingsModel.findUnique({ where: { shop } }) : null;
    } catch (_) {
      // ignore
    }
  }

  // Only create/find scan session if free plan has scans left (otherwise show upgrade modal in UI)
  let sessionId: string | null = null;
  const plan = shopSettings?.plan || "FREE";
  const scanCount = shopSettings?.scanCount ?? 0;
  const freeLimit = PLAN_LIMITS.FREE;
  const atFreeLimit = plan === "FREE" && scanCount >= freeLimit;

  if (!atFreeLimit) {
    try {
      const existingSession = await db.scanSession.findFirst({
        where: {
          shop,
          status: "PENDING",
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
      });

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const scanSession = await db.scanSession.create({
          data: {
            shop,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minute expiry
          }
        });
        sessionId = scanSession.id;
      }
    } catch (error) {
      console.error("Failed to create/find scan session:", error);
    }
  }

  // Fetch shop's currency code from Shopify (currencySymbol is not in Admin API)
  let currencySymbol = "$";
  try {
    const response = await admin.graphql(`
      query {
        shop {
          currencyCode
        }
      }
    `);
    const shopData: any = await response.json();
    const code = shopData.data?.shop?.currencyCode;
    if (code) {
      try {
        currencySymbol = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).formatToParts(0).find((p) => p.type === "currency")?.value ?? "$";
      } catch {
        currencySymbol = code === "USD" ? "$" : code === "EUR" ? "€" : code === "GBP" ? "£" : code + " ";
      }
    }
  } catch (e) {
    console.error("Failed to fetch shop currency info:", e);
  }

  const appUrl = process.env.SHOPIFY_APP_URL || new URL(request.url).origin;
  return json({ recentScans, shopSettings, appUrl, sessionId, currencySymbol });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: color + " Snowboard",
        },
      },
    },
  );
  const responseJson = await response.json();

  const product = responseJson.data!.productCreate!.product!;
  const variantId = product.variants.edges[0]!.node!.id!;

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );

  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson!.data!.productCreate!.product,
    variant:
      variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
  };
};

export default function Index() {
  const { recentScans, shopSettings, appUrl, sessionId: initialSessionId, currencySymbol } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  console.log("[DEBUG] SessionId from loader:", initialSessionId);

  const shopify = useAppBridge();
  const plan = shopSettings?.plan || "FREE";
  const scanCount = shopSettings?.scanCount || 0;
  const isFree = plan === "FREE";
  const freeLimit = PLAN_LIMITS.FREE;

  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId && typeof window !== 'undefined') {
      shopify.toast.show("Product created");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const pollFetcher = useFetcher<any>();
  const recentScansFetcher = useFetcher<{ recentScans: any[] }>();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);



  // Polling for results
  useEffect(() => {
    if (!sessionId && !recentScansFetcher.submit) return;

    const interval = setInterval(() => {
      if (sessionId) {
        pollFetcher.submit(null, { method: "POST", action: "/api/session?sessionId=" + sessionId });
      }
    }, 3000);

    // Global background polling for ALL scans (in case one session is missed or new ones arrive)
    const globalInterval = setInterval(() => {
      recentScansFetcher.submit(null, { method: "GET", action: "/api/recent-scans" });
    }, 5000); // Check every 5s for broad updates

    return () => {
      clearInterval(interval);
      clearInterval(globalInterval);
    };
  }, [sessionId, pollFetcher.submit, recentScansFetcher.submit]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const navigate = useNavigate();
  const atFreeLimit = isFree && scanCount >= freeLimit;
  const voiceEnabled = plan === "Growth" || plan === "Power";
  const [newImageUrl, setNewImageUrl] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState<'drafts' | 'posted' | 'all'>('drafts');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [allScans, setAllScans] = useState<any[]>(recentScans || []);
  const [initialProductData, setInitialProductData] = useState<any>(null);
  const [variantInput, setVariantInput] = useState("");
  const variantInputRef = useRef("");
  const [isRecordingVariants, setIsRecordingVariants] = useState(false);
  const voiceRecognitionRef = useRef<any>(null);
  const revalidator = useRevalidator();

  const updateProductFetcher = useFetcher<{ success?: boolean; error?: string }>();
  const parseVariantsFetcher = useFetcher<{ success?: boolean; variants?: any; error?: string }>();


  const hasChanges = initialProductData && scannedProduct && (
    scannedProduct.title !== initialProductData.title ||
    scannedProduct.productType !== initialProductData.productType ||
    scannedProduct.price !== initialProductData.price ||
    scannedProduct.tags !== initialProductData.tags ||
    scannedProduct.descriptionHtml !== initialProductData.descriptionHtml ||
    scannedProduct.estimatedWeight !== initialProductData.estimatedWeight ||
    JSON.stringify(scannedProduct.imageUrls) !== JSON.stringify(initialProductData.imageUrls) ||
    JSON.stringify(scannedProduct.variants) !== JSON.stringify(initialProductData.variants)
  );

  useEffect(() => {
    if (parseVariantsFetcher.data?.success && parseVariantsFetcher.data?.variants) {
      setScannedProduct((prev: any) => ({
        ...prev,
        variants: JSON.stringify(parseVariantsFetcher.data?.variants)
      }));
      variantInputRef.current = "";
      setVariantInput("");
      shopify.toast.show("Variants updated!");
    } else if (parseVariantsFetcher.data?.error) {
      shopify.toast.show("Failed to parse variants: " + parseVariantsFetcher.data.error);
    }
  }, [parseVariantsFetcher.data, shopify]);

  const handleParseVariants = () => {
    if (!variantInput.trim()) return;
    parseVariantsFetcher.submit(
      { transcript: variantInput.trim(), productId: scannedProduct?.id ?? "" },
      { method: "POST", action: "/api/parse-variants" }
    );
  };

  const handleVoiceVariants = async () => {
    if (typeof window === "undefined") return;

    if (!voiceEnabled) {
      shopify.toast.show("Voice variants are available on Growth and Power plans. Upgrade to unlock.");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      shopify.toast.show("Voice input is not supported in this browser");
      return;
    }

    if (isRecordingVariants && voiceRecognitionRef.current) {
      voiceRecognitionRef.current.stop();
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      shopify.toast.show("Microphone access is required for voice input. Please allow mic in your browser.");
      return;
    }

    variantInputRef.current = variantInput;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsRecordingVariants(true);
    recognition.onend = () => setIsRecordingVariants(false);
    recognition.onerror = () => {
      setIsRecordingVariants(false);
      shopify.toast.show("There was a problem with voice input");
    };

    recognition.onresult = (event: any) => {
      let text = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      const cleaned = text.trim();
      if (!cleaned) return;

      const prev = (variantInputRef.current || "").trim();
      const full = prev ? prev + " " + cleaned : cleaned;
      variantInputRef.current = full;
      setVariantInput(full);

      if (isFinal && scannedProduct?.id) {
        parseVariantsFetcher.submit(
          { transcript: full.trim(), productId: scannedProduct.id },
          { method: "POST", action: "/api/parse-variants" }
        );
        shopify.toast.show("Parsing spoken variants…");
      }
    };

    voiceRecognitionRef.current = recognition;
    recognition.start();
    shopify.toast.show("Listening… speak your variants (e.g. sizes S to XL)");
  };

  useEffect(() => {
    if (recentScans) {
      setAllScans(recentScans);
    }
  }, [recentScans]);

  const filteredScans = allScans.filter((scan: any) => {
    if (activeTab === 'drafts') return scan.status === 'DRAFT';
    if (activeTab === 'posted') return scan.status === 'PUBLISHED';
    // "all" tab shows both DRAFT and PUBLISHED items
    return scan.status === 'DRAFT' || scan.status === 'PUBLISHED';
  });


  const addImage = () => {
    if (newImageUrl) {
      const currentImages = scannedProduct.imageUrls || [];
      setScannedProduct({ ...scannedProduct, imageUrls: [...currentImages, newImageUrl] });
      setNewImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...(scannedProduct.imageUrls || [])];
    newImages.splice(index, 1);
    setScannedProduct({ ...scannedProduct, imageUrls: newImages });
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleReorderImages = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const newImages = [...(scannedProduct.imageUrls || [])];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedItem);
    setScannedProduct({ ...scannedProduct, imageUrls: newImages });
    setDraggedIndex(null);
  };

  const handleSetMainImage = (index: number) => {
    if (index === 0) return;
    const newImages = [...(scannedProduct.imageUrls || [])];
    const [selectedItem] = newImages.splice(index, 1);
    newImages.unshift(selectedItem);
    setScannedProduct({ ...scannedProduct, imageUrls: newImages });
  };

  useEffect(() => {
    if (pollFetcher.data?.status === "COMPLETED" && pollFetcher.data?.product) {
      const newProduct = pollFetcher.data.product;

      setAllScans(prev => {
        if (prev.find(s => s.id === newProduct.id)) return prev;

        shopify.toast.show("New item scanned and added to your list!");

        if (!isModalOpen) {
          setScannedProduct(newProduct);
        }

        return [newProduct, ...prev];
      });
    }
  }, [pollFetcher.data, shopify, isModalOpen]);

  // Handle Global Background Updates — only notify when there are new DRAFT scans to review
  const isFirstLoad = useRef(true);
  const initialSilenceUntil = useRef<number>(Date.now() + 10000); // No "new scan" toasts for first 10s

  useEffect(() => {
    if (recentScansFetcher.data?.recentScans) {
      const incoming = recentScansFetcher.data.recentScans;

      setAllScans(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const newItems = incoming.filter((s: any) => !existingIds.has(s.id));
        const newDraftsToReview = newItems.filter((s: any) => s.status === "DRAFT");

        if (newItems.length > 0) {
          const merged = [...prev, ...newItems];
          const sorted = merged.sort((a: any, b: any) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          // Only show toast when there are new DRAFTs to review, and not during initial silence
          if (
            newDraftsToReview.length > 0 &&
            !isFirstLoad.current &&
            Date.now() >= initialSilenceUntil.current
          ) {
            const n = newDraftsToReview.length;
            shopify.toast.show(n === 1 ? "1 new scan to review" : n + " new scans to review");
          }
          return sorted;
        }
        return prev;
      });

      if (isFirstLoad.current) {
        isFirstLoad.current = false;
      }
    }
  }, [recentScansFetcher.data, shopify]);


  const searchImagesFetcher = useFetcher<{ imageUrls?: string[]; error?: string; message?: string }>();


  const handleAutoFindImages = () => {
    console.log("Triggering Auto-Find Images...");
    if (!scannedProduct?.title) {
      console.warn("No title found in scannedProduct");
      return;
    }
    const query = scannedProduct.title;
    console.log("Searching for query: \"" + query + "\"");
    shopify.toast.show("Searching images for \"" + query + "\"...");
    searchImagesFetcher.submit(
      { query },
      { method: "POST", action: "/api/search-images", encType: "application/json" }
    );
  };

  useEffect(() => {
    if (searchImagesFetcher.data?.imageUrls) {
      const currentImages = scannedProduct?.imageUrls || [];
      // Dedup and append
      const newImages = searchImagesFetcher.data.imageUrls.filter((url: string) => !currentImages.includes(url));

      if (newImages.length > 0) {
        setScannedProduct((prev: any) => ({
          ...prev,
          imageUrls: [...(prev.imageUrls || []), ...newImages]
        }));
        shopify.toast.show("Added " + newImages.length + " high-quality image" + (newImages.length === 1 ? "" : "s") + " from the brand's official site");
      } else {
        const msg = searchImagesFetcher.data?.message || "No new images found — try editing the product title and search again";
        shopify.toast.show(msg);
      }
    } else if (searchImagesFetcher.data?.error) {
      shopify.toast.show("Image Search Failed: " + searchImagesFetcher.data.error);
    }
  }, [searchImagesFetcher.data, shopify]);

  const listProductFetcher = useFetcher<{ success?: boolean; error?: string }>();

  const handleListProduct = () => {
    listProductFetcher.submit(
      { product: JSON.stringify(scannedProduct) },
      { method: "POST", action: "/api/list-product" }
    );
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (listProductFetcher.data?.success) {
      const listedId = scannedProduct?.id;
      setIsModalOpen(false);
      shopify.toast.show("Product added to Shopify drafts for your review!");


      if (listedId) {
        setAnimatingIds(prev => {
          const next = new Set(prev);
          next.add(listedId);
          return next;
        });
        setTimeout(() => {
          setAllScans(prev => prev.map(s => s.id === listedId ? { ...s, status: 'PUBLISHED' } : s));
          revalidator.revalidate();
          setAnimatingIds(prev => {
            const next = new Set(prev);
            next.delete(listedId);
            return next;
          });
        }, 500);
      }
    } else if (listProductFetcher.data?.error) {
      shopify.toast.show("Listing Failed: " + listProductFetcher.data.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listProductFetcher.data]);

  const deleteProductFetcher = useFetcher<{ success?: boolean; error?: string }>();

  const handleDeleteProduct = (productId: string) => {
    setProductToDelete(productId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      const deletedId = productToDelete;
      setAnimatingIds(prev => {
        const next = new Set(prev);
        next.add(deletedId);
        return next;
      });

      deleteProductFetcher.submit(
        { productId: productToDelete },
        { method: "POST", action: "/api/delete-product" }
      );
      setIsDeleteModalOpen(false);

      setTimeout(() => {
        setAllScans(prev => prev.filter(s => s.id !== deletedId));
        revalidator.revalidate();
        setAnimatingIds(prev => {
          const next = new Set(prev);
          next.delete(deletedId);
          return next;
        });
        setProductToDelete(null);
      }, 500);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  useEffect(() => {
    if (updateProductFetcher.data?.success) {
      shopify.toast.show("Draft updated successfully");
      const updatedProduct = scannedProduct;
      setInitialProductData(updatedProduct); // Reset "changes" state to current values

      // Update the local list so the UI reflects the core changes (title, price, type)
      setAllScans(prev => prev.map(s => s.id === updatedProduct.id ? { ...s, ...updatedProduct } : s));
    } else if (updateProductFetcher.data?.error) {
      shopify.toast.show("Update Failed: " + updateProductFetcher.data.error);
    }
  }, [updateProductFetcher.data, shopify]);

  useEffect(() => {
    if (deleteProductFetcher.data?.success) {
      shopify.toast.show("Product deleted successfully");
    } else if (deleteProductFetcher.data?.error) {
      shopify.toast.show("Delete Failed: " + deleteProductFetcher.data.error);
    }
  }, [deleteProductFetcher.data, shopify]);

  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  const accentGreen = "#6BE575";
  const primaryTeal = "#1a514d";
  const textDark = "#1a1a1a";

  const headerRight = isFree ? (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
      {scanCount >= freeLimit ? (
        <>
          <span style={{ fontSize: "14px", opacity: 0.95 }}>Scan limit reached · {freeLimit} scans used</span>
          <Link url="/app/pricing">
            <span style={{ fontSize: "14px", fontWeight: 600, color: "white", textDecoration: "underline", opacity: 0.95 }}>Upgrade</span>
          </Link>
        </>
      ) : (
        <>
          <span style={{ fontSize: "14px", opacity: 0.95 }}>Free Plan · {scanCount} of {freeLimit} scans</span>
          <div style={{ width: "72px", height: "4px", background: "rgba(255,255,255,0.25)", borderRadius: "999px", overflow: "hidden" }}>
            <div className="dashboard-header-progress-fill" style={{ width: (Math.min(100, (scanCount / freeLimit) * 100)) + "%", height: "100%", borderRadius: "999px", transition: "width 0.3s ease" }} />
          </div>
          <Link url="/app/pricing">
            <span style={{ fontSize: "14px", fontWeight: 600, color: "white", textDecoration: "underline", opacity: 0.95 }}>Plans</span>
          </Link>
        </>
      )}
    </div>
  ) : undefined;

  return (
    <DashboardPageLayout title="Auto Entry Dashboard" subtitle="Dashboard" headerRight={headerRight}>
        <BlockStack gap="500">
        <style>{`
          @keyframes slideAndFadeOut {
            0% { transform: translateX(0); opacity: 1; max-height: 500px; margin-bottom: 20px; }
            100% { transform: translateX(-100%); opacity: 0; max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; border-width: 0; }
          }
          .card-animating-out {
            animation: slideAndFadeOut 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
            pointer-events: none;
            overflow: hidden;
          }
          .app-index-plan-progress-fill {
            background: #004c46 !important;
          }
          .dashboard-header-progress-fill {
            background: #6be575 !important;
          }
        `}</style>

        {/* Hero: AirAsia-style — white card, green CTA, QR right */}
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="600" data-qr-section>
                <InlineStack align="space-between" blockAlign="center" gap="800" wrap={false}>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg" fontWeight="bold" style={{ fontSize: "26px", lineHeight: 1.3 }}>
                      <span style={{ color: primaryTeal }}>Intelligent Inventory</span>
                      <span style={{ color: "#004c46" }}> Capturing</span>
                    </Text>
                    <Text as="p" variant="bodyMd" style={{ fontSize: "17px", color: primaryTeal }}>
                      <span style={{ color: primaryTeal }}>Automate product entry with AI. </span>
                      <span style={{ color: accentGreen, fontWeight: 600 }}>Fast, accurate, synced to Shopify.</span>
                    </Text>
                    <BlockStack gap="300">
                      <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a", fontSize: "16px" }}>
                        Sync your mobile — scan QR to link.
                      </Text>
                      <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a", fontSize: "16px" }}>
                        Smart capture — photo, AI extracts data.
                      </Text>
                      <Text as="p" variant="bodyMd" style={{ color: "#1a1a1a", fontSize: "16px" }}>
                        Review in Shopify when ready.
                      </Text>
                    </BlockStack>
                  </BlockStack>
                  <Box id="mobile-scan-qr" padding="400" background="bg-surface-secondary" borderRadius="300" minWidth="200px">
                    <BlockStack gap="300">
                      {atFreeLimit ? (
                        <>
                          <Text as="p" variant="bodyMd" fontWeight="semibold" style={{ color: textDark }}>
                            You've used your 5 free scans
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Upgrade your plan to keep scanning.
                          </Text>
                          <Button variant="primary" tone="success" onClick={() => setUpgradeModalOpen(true)}>
                            Upgrade
                          </Button>
                        </>
                      ) : typeof window !== "undefined" && sessionId ? (
                        <>
                          <InlineStack align="center" blockAlign="center" gap="200">
                            <Box background="bg-surface-primary" padding="200" borderRadius="200" borderWidth="025" borderColor="border-secondary">
                              <QRCodeSVG value={appUrl + "/mobile/" + sessionId} size={160} level="M" includeMargin={false} />
                            </Box>
                          </InlineStack>
                          <Button
                            variant="primary"
                            tone="success"
                            onClick={() => { navigator.clipboard.writeText(appUrl + "/mobile/" + sessionId); shopify.toast.show("URL copied"); }}
                          >
                            Copy URL
                          </Button>
                          <div style={{ textAlign: "center" }}>
                            <Text as="p" variant="bodySm" tone="subdued">Scan to open</Text>
                          </div>
                        </>
                      ) : (
                        <>
                          <Text as="p" variant="bodySm" tone="subdued">Initializing…</Text>
                          <div style={{ textAlign: "center" }}>
                            <Text as="p" variant="bodySm" tone="subdued">Scan to open</Text>
                          </div>
                        </>
                      )}
                    </BlockStack>
                  </Box>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
        {/* Recent Scans Grid */}
        <Layout>
          <Layout.Section>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center" gap="200">
                <div style={{ background: "rgba(0,0,0,0.06)", borderRadius: "10px", padding: "2px", display: "flex" }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('drafts')}
                    style={{
                      background: activeTab === 'drafts' ? "white" : "transparent",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      boxShadow: activeTab === 'drafts' ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: activeTab === 'drafts' ? textDark : "#64748b"
                    }}
                  >
                    To Review ({allScans.filter((s: any) => s.status === 'DRAFT').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('posted')}
                    style={{
                      background: activeTab === 'posted' ? "white" : "transparent",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      boxShadow: activeTab === 'posted' ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: activeTab === 'posted' ? textDark : "#64748b"
                    }}
                  >
                    Drafts ({allScans.filter((s: any) => s.status === 'PUBLISHED').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (recentScansFetcher.state === "submitting") return;
                      setActiveTab("all");
                      recentScansFetcher.submit({ all: "true" }, { method: "GET", action: "/api/recent-scans" });
                      shopify.toast.show("Showing all items");
                    }}
                    disabled={recentScansFetcher.state === "submitting"}
                    style={{
                      background: activeTab === 'all' ? "white" : "transparent",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      cursor: recentScansFetcher.state === "submitting" ? "default" : "pointer",
                      boxShadow: activeTab === 'all' ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: activeTab === 'all' ? textDark : "#64748b",
                      opacity: recentScansFetcher.state === "submitting" ? 0.6 : 1
                    }}
                  >
                    {recentScansFetcher.state === "submitting" ? "Loading..." : "View All"}
                  </button>
                </div>
                <div style={{ background: "rgba(0,0,0,0.06)", borderRadius: "10px", padding: "2px", display: "flex" }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    style={{
                      background: viewMode === 'grid' ? "white" : "transparent",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      boxShadow: viewMode === 'grid' ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: viewMode === 'grid' ? textDark : "#64748b"
                    }}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    style={{
                      background: viewMode === 'list' ? "white" : "transparent",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      boxShadow: viewMode === 'list' ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: viewMode === 'list' ? textDark : "#64748b"
                    }}
                  >
                    List
                  </button>
                </div>
              </InlineStack>
              {filteredScans.length === 0 ? (
                <Card>
                  <EmptyState
                    heading={
                      allScans.length === 0
                        ? "Capture your first product"
                        : activeTab === "drafts"
                          ? "No draft products to review"
                          : "No products posted yet"
                    }
                    image="https://cdn.shopify.com/s/files/1/0564/3957/0639/files/Frame_427321848.png?v=1770912768"
                    action={
                      allScans.length === 0
                        ? {
                            content: "Show QR code",
                            onAction: () => atFreeLimit ? setUpgradeModalOpen(true) : document.getElementById("mobile-scan-qr")?.scrollIntoView({ behavior: "smooth" }),
                          }
                        : undefined
                    }
                    secondaryAction={
                      allScans.length > 0 && activeTab === "drafts"
                        ? {
                            content: "View all scans",
                            onAction: () => {
                              setActiveTab("all");
                              recentScansFetcher.submit({ all: "true" }, { method: "GET", action: "/api/recent-scans" });
                            },
                          }
                        : undefined
                    }
                  >
                    <p>
                      {allScans.length === 0
                        ? "Scan the QR code with your phone to open the scanner, then take a photo of a product. It will appear here for review."
                        : activeTab === "drafts"
                          ? "Drafts will show up here after you scan. Try scanning a product from your phone."
                          : "Products you add to Shopify will appear here once published."}
                    </p>
                  </EmptyState>
                </Card>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
                      {filteredScans.map((scan: any) => (
                        <div
                          key={scan.id}
                          className="dashboard-scan-card"
                          style={{
                            background: "white",
                            borderRadius: "12px",
                            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                            overflow: "hidden",
                            border: "1px solid rgba(107, 229, 117, 0.25)",
                            display: "flex",
                            flexDirection: "column",
                            transition: "all 0.2s ease",
                            position: "relative",
                            ...(animatingIds.has(scan.id) && { animation: 'slideAndFadeOut 0.5s forwards', pointerEvents: 'none' })
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                            e.currentTarget.style.borderColor = "rgba(107, 229, 117, 0.45)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)";
                            e.currentTarget.style.borderColor = "rgba(107, 229, 117, 0.25)";
                          }}
                        >
                          <div style={{ height: "160px", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                            {scan.imageUrls && scan.imageUrls.length > 0 ? (
                              <img src={scan.imageUrls[0]} alt={scan.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                <div style={{ width: "40px", height: "40px", background: "#e5e7eb", borderRadius: "50%" }} />
                                <Text as="p" variant="bodySm" tone="subdued">No Image</Text>
                              </div>
                            )}
                            <div style={{
                              position: "absolute",
                              top: "10px",
                              right: "10px",
                              background: scan.status === 'PUBLISHED' ? accentGreen : "rgba(255,255,255,0.95)",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "10px",
                              fontWeight: "600",
                              color: scan.status === 'PUBLISHED' ? "#1a1a1a" : "#6b7280",
                              letterSpacing: "0.3px",
                              backdropFilter: "blur(4px)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                            }}>
                              {scan.status === 'PUBLISHED' ? "Published" : scan.status}
                            </div>
                          </div>
                          <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                            <Text as="h3" variant="headingSm" truncate>{scan.title || "Untitled Product"}</Text>
                            <Text as="p" variant="bodySm" tone="subdued">{scan.productType || "Uncategorized"}</Text>
                            <div style={{ marginTop: "auto", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                              <Text as="span" variant="headingSm" fontWeight="semibold">{scan.price ? currencySymbol + scan.price : "—"}</Text>
                              <div style={{ display: "flex", gap: "6px" }}>
                                {scan.status === 'PUBLISHED' ? (
                                  <Button
                                    variant="secondary"
                                    size="slim"
                                    onClick={() => window.open('https://admin.shopify.com/store/' + shopSettings.shop.replace('.myshopify.com', '') + '/products', '_blank')}
                                    title="Opens Shopify Admin. The product is saved as a draft — review and approve it there before publishing to your store."
                                  >
                                    In Shopify
                                  </Button>
                                ) : (
                                  <Button
                                    variant="primary"
                                    size="slim"
                                    onClick={() => {
                                      setScannedProduct(scan);
                                      setInitialProductData(scan);
                                      setIsModalOpen(true);
                                    }}
                                    tone="success"
                                  >
                                    Review
                                  </Button>
                                )}
                                <button
                                  onClick={() => handleDeleteProduct(scan.id)}
                                  disabled={deleteProductFetcher.state === "submitting"}
                                  style={{
                                    padding: "8px",
                                    background: "#f3f4f6",
                                    color: "#6b7280",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    cursor: deleteProductFetcher.state === "submitting" ? "not-allowed" : "pointer",
                                    fontSize: "13px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.15s ease",
                                    opacity: deleteProductFetcher.state === "submitting" ? 0.6 : 1
                                  }}
                                  onMouseEnter={(e) => {
                                    if (deleteProductFetcher.state !== "submitting") {
                                      e.currentTarget.style.background = "#fee2e2";
                                      e.currentTarget.style.borderColor = "#fecaca";
                                      e.currentTarget.style.color = "#dc2626";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#f3f4f6";
                                    e.currentTarget.style.borderColor = "#e5e7eb";
                                    e.currentTarget.style.color = "#6b7280";
                                  }}
                                  title="Delete draft"
                                >
                                  {deleteProductFetcher.state === "submitting" ? "..." : "🗑️"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {filteredScans.map((scan: any) => (
                        <div
                          key={scan.id}
                          className="dashboard-scan-card"
                          style={{
                            background: "white",
                            borderRadius: "12px",
                            border: "1px solid rgba(107, 229, 117, 0.2)",
                            padding: "14px 16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                            transition: "all 0.15s ease",
                            ...(animatingIds.has(scan.id) && { animation: 'slideAndFadeOut 0.5s forwards', pointerEvents: 'none' })
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                            e.currentTarget.style.borderColor = "rgba(107, 229, 117, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)";
                            e.currentTarget.style.borderColor = "rgba(107, 229, 117, 0.2)";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "16px", overflow: "hidden", flex: 1 }}>
                            <div style={{ width: "52px", height: "52px", background: "#f9fafb", borderRadius: "8px", overflow: "hidden", flexShrink: 0, position: "relative", border: "1px solid #e5e7eb" }}>
                              {scan.imageUrls && scan.imageUrls.length > 0 ? (
                                <img src={scan.imageUrls[0]} alt={scan.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
                                  <div style={{ width: "20px", height: "20px", background: "#e5e7eb", borderRadius: "50%" }} />
                                </div>
                              )}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <Text as="h3" variant="headingSm" truncate>{scan.title || "Untitled Product"}</Text>
                                {scan.status === 'PUBLISHED' ? (
                                  <span style={{
                                    background: "#e6f4ea",
                                    padding: "4px 12px",
                                    borderRadius: "16px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: "#1e8e3e",
                                    letterSpacing: "0.5px",
                                    flexShrink: 0
                                  }}>
                                    Drafts
                                  </span>
                                ) : (
                                  <span style={{
                                    background: "#f3f4f6",
                                    padding: "4px 12px",
                                    borderRadius: "16px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: "#6b7280",
                                    letterSpacing: "0.5px",
                                    flexShrink: 0
                                  }}>
                                    Review
                                  </span>
                                )}
                              </div>
                              <InlineStack gap="200" align="start">
                                <Text as="span" variant="bodySm" tone="subdued">{scan.productType || "Uncategorized"}</Text>
                                <Text as="span" variant="bodySm" tone="subdued">•</Text>
                                <Text as="span" variant="bodySm" tone="subdued">{scan.createdAt ? new Date(scan.createdAt).toLocaleDateString() : "Just now"}</Text>
                              </InlineStack>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
                            <Text as="span" variant="headingMd" fontWeight="semibold">{scan.price ? currencySymbol + scan.price : "—"}</Text>
                            <div style={{ display: "flex", gap: "8px" }}>
                                {scan.status === 'PUBLISHED' ? (
                                  <button
                                    onClick={() => window.open('https://admin.shopify.com/store/' + shopSettings.shop.replace('.myshopify.com', '') + '/products', '_blank')}
                                    title="Opens Shopify Admin. The product is saved as a draft — review and approve it there before publishing to your store."
                                    style={{
                                      padding: "8px 16px",
                                      background: "white",
                                      color: primaryTeal,
                                      border: "1px solid " + primaryTeal,
                                      borderRadius: "10px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    minWidth: "120px",
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  Review draft in Shopify
                                </button>
                              ) : (
                                <button
                                  className="dashboard-btn-primary"
                                  onClick={() => {
                                    setScannedProduct(scan);
                                    setInitialProductData(scan);
                                    setIsModalOpen(true);
                                  }}
                                  style={{
                                    padding: "8px 16px",
                                    background: accentGreen,
                                    color: "#1a1a1a",
                                    border: "none",
                                    borderRadius: "10px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    minWidth: "80px",
                                    transition: "all 0.15s ease"
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "#5bd366"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = accentGreen; }}
                                >
                                  Review
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteProduct(scan.id)}
                                disabled={deleteProductFetcher.state === "submitting"}
                                style={{
                                  padding: "8px 12px",
                                  background: "#f3f4f6",
                                  color: "#6b7280",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "6px",
                                  cursor: deleteProductFetcher.state === "submitting" ? "not-allowed" : "pointer",
                                  fontSize: "13px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.15s ease",
                                  opacity: deleteProductFetcher.state === "submitting" ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => {
                                  if (deleteProductFetcher.state !== "submitting") {
                                    e.currentTarget.style.background = "#fee2e2";
                                    e.currentTarget.style.borderColor = "#fecaca";
                                    e.currentTarget.style.color = "#dc2626";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#f3f4f6";
                                  e.currentTarget.style.borderColor = "#e5e7eb";
                                  e.currentTarget.style.color = "#6b7280";
                                }}
                                title="Delete draft"
                              >
                                {deleteProductFetcher.state === "submitting" ? "..." : "🗑️"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </BlockStack >
          </Layout.Section>
        </Layout>
      </BlockStack>
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInitialProductData(null);
        }}
        title="Review Scanned Product"
        footer={
          <div className="review-modal-footer-actions">
            <InlineStack gap="200">
            <Button
              variant="plain"
              onClick={() => {
                updateProductFetcher.submit(
                  { product: JSON.stringify(scannedProduct) },
                  { method: "POST", action: "/api/update-product" }
                );
              }}
              disabled={!hasChanges}
              loading={updateProductFetcher.state === "submitting"}
            >
              <span style={{ color: "#1a1a1a" }}>Save</span>
            </Button>
            <button
              type="button"
              onClick={() => handleListProduct()}
              disabled={listProductFetcher.state === "submitting"}
              style={{
                background: "#6be575",
                color: "#1a1a1a",
                border: "1px solid #6be575",
                borderRadius: "10px",
                padding: "8px 16px",
                fontWeight: 600,
                boxShadow: "none",
                cursor: listProductFetcher.state === "submitting" ? "wait" : "pointer",
                fontSize: "14px",
              }}
              onMouseEnter={(e) => { if (listProductFetcher.state !== "submitting") { e.currentTarget.style.background = "#5bd366"; e.currentTarget.style.borderColor = "#5bd366"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#6be575"; e.currentTarget.style.borderColor = "#6be575"; }}
            >
              {listProductFetcher.state === "submitting" ? "Loading…" : "Review in Shopify"}
            </button>
          </InlineStack>
          </div>
        }
      >
        <Modal.Section>
          {scannedProduct && (
            <InlineGrid columns={{ xs: '1', md: ['oneThird', 'twoThirds'] }} gap="400">
              <div style={{ minWidth: 0 }}>
                <div style={{ position: 'sticky', top: 0 }}>
                  <BlockStack gap="300">
                    <div style={{
                      aspectRatio: '1/1',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #e1e3e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      {scannedProduct.imageUrls && scannedProduct.imageUrls.length > 0 ? (
                        <img src={scannedProduct.imageUrls[0]} alt="Main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📷</span>
                          <Text as="p" tone="subdued">No Image</Text>
                        </div>
                      )}
                    </div>

                    {scannedProduct.imageUrls && scannedProduct.imageUrls.length > 0 && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        width: '100%'
                      }}>
                        {scannedProduct.imageUrls.map((url: string, index: number) => (
                          <div
                            key={index}
                            draggable
                            onDragStart={() => setDraggedIndex(index)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.transform = 'scale(1)';
                              handleReorderImages(index);
                            }}
                            onClick={() => handleSetMainImage(index)}
                            style={{
                              position: 'relative',
                              aspectRatio: '1/1',
                              minWidth: 0,
                              cursor: 'pointer',
                              transition: 'transform 0.1s ease',
                              border: index === 0 ? '2px solid #008060' : '1px solid #e1e3e5',
                              padding: index === 0 ? '2px' : '0',
                              borderRadius: '8px',
                              overflow: 'visible'
                            }}
                          >
                            <img
                              src={url}
                              alt={"Thumbnail " + index}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '6px',
                              }}
                            />
                            {index === 0 && (
                              <div style={{
                                position: 'absolute',
                                bottom: -4,
                                right: -4,
                                background: '#008060',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '8px',
                                fontSize: '8px',
                                fontWeight: 'bold',
                                zIndex: 2
                              }}>
                                MAIN
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(index);
                              }}
                              style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                background: 'white',
                                borderRadius: '50%',
                                border: '1px solid #d82c0d',
                                width: 20,
                                height: 20,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                color: '#d82c0d',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                zIndex: 1
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={handleAutoFindImages}
                      disabled={searchImagesFetcher.state === "submitting"}
                      title="Search the web for high-quality product photos and add them to your list"
                      style={{
                        padding: '8px 16px',
                        background: 'white',
                        color: '#1a1a1a',
                        border: '1px solid #d1d5db',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        width: '100%',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '8px'
                      }}
                    >
                      {searchImagesFetcher.state === "submitting" ? (
                        <span>Searching for high-quality images...</span>
                      ) : (
                        <span>Auto search images</span>
                      )}
                    </button>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Pulls high-quality product photos from the web.
                    </Text>

                  </BlockStack>
                </div>
              </div>

              <BlockStack gap="400">
                <FormLayout>
                  <TextField
                    label="Product Title"
                    value={scannedProduct.title}
                    onChange={(value) => setScannedProduct({ ...scannedProduct, title: value })}
                    autoComplete="off"
                  />
                  <FormLayout.Group>
                    <TextField
                      label="Product Type"
                      value={scannedProduct.productType}
                      onChange={(value) => setScannedProduct({ ...scannedProduct, productType: value })}
                      autoComplete="off"
                      helpText="Product category (e.g. Electronics, Food & Beverages)"
                    />
                    <TextField
                      label="Price"
                      value={scannedProduct.price}
                      onChange={(value) => setScannedProduct({ ...scannedProduct, price: value })}
                      autoComplete="off"
                      prefix={currencySymbol}
                    />
                  </FormLayout.Group>
                  <TextField
                    label="Weight in kilograms"
                    type="number"
                    value={scannedProduct.estimatedWeight != null && scannedProduct.estimatedWeight !== "" ? String(Number(scannedProduct.estimatedWeight) / 1000) : ""}
                    onChange={(value) => setScannedProduct({ ...scannedProduct, estimatedWeight: value === "" ? undefined : Math.max(0, parseFloat(value) * 1000) })}
                    autoComplete="off"
                  />
                  <TextField
                    label="Tags"
                    value={scannedProduct.tags}
                    onChange={(value) => setScannedProduct({ ...scannedProduct, tags: value })}
                    autoComplete="off"
                    helpText="Comma separated tags"
                  />
                  <TextField
                    label="Description (HTML)"
                    value={scannedProduct.descriptionHtml}
                    onChange={(value) => setScannedProduct({ ...scannedProduct, descriptionHtml: value })}
                    multiline={4}
                    autoComplete="off"
                  />
                </FormLayout>

                <BlockStack gap="400">
                  <div style={{
                    background: '#f9fafb',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e1e3e5',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8)'
                  }}>
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text as="h3" variant="headingMd" fontWeight="bold">Variants</Text>
                        <span style={{ background: "rgba(107, 229, 117, 0.25)", color: "#1a514d", fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "999px" }}>AI Powered</span>
                      </InlineStack>
                      <p style={{ margin: 0, fontSize: "11px", color: "#6d7175" }}>{voiceEnabled ? "Type or use Mic — browser may ask for microphone access. Speak e.g. \"Sizes S to XL\" or \"Colors red, blue\"." : "Type variants below. Voice (mic) is available on Growth and Power plans."}</p>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Quick-add variants"
                            labelHidden
                            placeholder="e.g. Sizes Small to XL, Colors Red & Blue"
                            value={variantInput}
                            onChange={(val) => {
                              variantInputRef.current = val;
                              setVariantInput(val);
                            }}
                            autoComplete="off"
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={handleVoiceVariants}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '999px',
                              border: '1px solid #d1d5db',
                              background: !voiceEnabled ? '#f3f4f6' : isRecordingVariants ? '#fee2e2' : 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: voiceEnabled ? 'pointer' : 'not-allowed',
                              color: !voiceEnabled ? '#9ca3af' : isRecordingVariants ? '#d82c0d' : '#6be575',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              opacity: voiceEnabled ? 1 : 0.8
                            }}
                            title={!voiceEnabled ? "Upgrade to Growth or Power to use voice variants" : isRecordingVariants ? "Stop recording" : "Allow mic when prompted, then speak variants (e.g. Sizes S to XL)"}
                            aria-label={!voiceEnabled ? "Voice variants — upgrade to Growth or Power" : isRecordingVariants ? "Stop recording" : "Dictate variants with microphone"}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="20"
                              height="20"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"></path>
                              <path d="M19 11v1a7 7 0 0 1-14 0v-1"></path>
                              <line x1="12" y1="19" x2="12" y2="22"></line>
                              <line x1="8" y1="22" x2="16" y2="22"></line>
                            </svg>
                          </button>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a' }}>Mic</span>
                        </div>
                        <button
                          onClick={handleParseVariants}
                          disabled={parseVariantsFetcher.state === "submitting" || !variantInput.trim()}
                          style={{
                            padding: '8px 16px',
                            background: '#004c46',
                            color: 'white',
                            border: '1px solid #004c46',
                            borderRadius: '6px',
                            cursor: (parseVariantsFetcher.state === "submitting" || !variantInput.trim()) ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            opacity: (parseVariantsFetcher.state === "submitting" || !variantInput.trim()) ? 0.6 : 1,
                            transition: 'all 0.2s',
                            boxShadow: 'none'
                          }}
                          onMouseEnter={(e) => { if (parseVariantsFetcher.state !== "submitting" && variantInput.trim()) { e.currentTarget.style.background = '#1a514d'; e.currentTarget.style.borderColor = '#1a514d'; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#004c46'; e.currentTarget.style.borderColor = '#004c46'; }}
                        >
                          {parseVariantsFetcher.state === "submitting" ? "Parsing..." : "Add"}
                        </button>
                      </div>

                      {scannedProduct.variants && (
                        <div style={{ marginTop: '4px' }}>
                          <BlockStack gap="300">
                            {(() => {
                              try {
                                const variantData = typeof scannedProduct.variants === 'string'
                                  ? JSON.parse(scannedProduct.variants)
                                  : scannedProduct.variants;

                                if (!variantData || !variantData.options) return null;

                                return variantData.options.map((opt: any, i: number) => (
                                  <div key={i} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                    <BlockStack gap="200">
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text as="p" variant="bodySm" fontWeight="bold" tone="subdued">{opt.name.toUpperCase()}</Text>
                                        <button
                                          onClick={() => {
                                            const newOptions = [...variantData.options];
                                            newOptions.splice(i, 1);
                                            setScannedProduct({
                                              ...scannedProduct,
                                              variants: JSON.stringify({ options: newOptions })
                                            });
                                          }}
                                          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '10px' }}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                      <InlineStack gap="200" wrap>
                                        {opt.values.map((val: string, j: number) => {
                                          const qty = opt.quantities && opt.quantities[j];
                                          const label = qty != null ? `${val} (${qty})` : val;
                                          return (
                                            <Tag key={j} onRemove={() => {
                                            const newOptions = [...variantData.options];
                                            const newValues = [...newOptions[i].values];
                                            const newQuantities = newOptions[i].quantities ? [...newOptions[i].quantities!] : undefined;
                                            newValues.splice(j, 1);
                                            if (newQuantities) newQuantities.splice(j, 1);
                                            if (newValues.length === 0) {
                                              newOptions.splice(i, 1);
                                            } else {
                                              newOptions[i] = { ...newOptions[i], values: newValues, ...(newQuantities ? { quantities: newQuantities } : {}) };
                                            }
                                            setScannedProduct({
                                              ...scannedProduct,
                                              variants: JSON.stringify({ options: newOptions })
                                            });
                                          }}>{label}</Tag>
                                          );
                                        })}
                                      </InlineStack>
                                    </BlockStack>
                                  </div>
                                ));
                              } catch (e) {
                                return <Text as="p" tone="subdued">Error parsing variant data</Text>;
                              }
                            })()}
                          </BlockStack>
                        </div>
                      )}
                    </BlockStack>
                  </div>
                </BlockStack>
              </BlockStack>
            </InlineGrid>
          )}
        </Modal.Section>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={isDeleteModalOpen}
        onClose={cancelDelete}
        title="Delete draft product?"
        primaryAction={{
          content: 'Delete',
          onAction: confirmDelete,
          destructive: true,
          loading: deleteProductFetcher.state === "submitting"
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: cancelDelete,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "16px",
              background: "#fef2f2",
              borderRadius: "8px",
              border: "1px solid #fee2e2"
            }}>
              <div style={{
                fontSize: "24px",
                lineHeight: "1",
                flexShrink: 0
              }}>
                ⚠️
              </div>
              <div>
                <Text as="p" variant="bodyMd">
                  This action cannot be undone. The draft product will be permanently removed from your database.
                </Text>
              </div>
            </div>
            <Text as="p" variant="bodySm" tone="subdued">
              Note: This will only delete the draft from your Auto Entry workspace. If you have already listed this product to your Shopify store, it will remain there.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Upgrade modal when free scan limit reached */}
      <Modal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title="Upgrade to continue"
        primaryAction={{
          content: "View plans",
          onAction: () => {
            setUpgradeModalOpen(false);
            navigate("/app/pricing");
          },
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setUpgradeModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd">
            You've used your 5 free scans. Upgrade your plan to keep scanning and adding products.
          </Text>
        </Modal.Section>
      </Modal>
    </DashboardPageLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  return (
    <AppProvider i18n={enTranslations}>
      <Page>
        <TitleBar title="Error" />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Application Error</Text>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200" overflowX="scroll">
                  <pre>{error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}</pre>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
