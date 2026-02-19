
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const lastProduct = await prisma.scannedProduct.findFirst({
        include: { session: true },
        orderBy: { session: { createdAt: 'desc' } }
    });

    if (!lastProduct) {
        console.error("No product found to update.");
        return;
    }

    console.log(`Updating product: ${lastProduct.title} (ID: ${lastProduct.id})`);

    const realImages = [
        "https://resource.logitech.com/content/dam/logitech/en/products/mice/b100/gallery/b100-blackcharcoal-gallery-1.png",
        "https://images.novatech.co.uk/logitech-910-003357.jpg",
        "https://www.scan.co.uk/images/products/xlarge/2430149-xl-d.jpg",
        "https://m.media-amazon.com/images/I/41Hvrq2UKTL.jpg",
        "https://www.quietpc.com/images/products/logitech-b100-top-large.jpg"
    ];

    let existingImages = [];
    try {
        existingImages = JSON.parse(lastProduct.imageUrls || '[]');
    } catch (e) {
        existingImages = lastProduct.imageUrls ? [lastProduct.imageUrls] : [];
    }

    // Filter out placeholders
    const cleanImages = existingImages.filter(img => !img.includes('placehold.co'));

    const updatedImages = [...cleanImages, ...realImages];

    await prisma.scannedProduct.update({
        where: { id: lastProduct.id },
        data: {
            imageUrls: JSON.stringify(updatedImages)
        }
    });

    console.log("Product updated successfully with real images!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
