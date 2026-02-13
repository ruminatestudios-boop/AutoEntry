import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Auto Entry for Shopify</h1>
        <p className={styles.text}>
          Automate product and inventory data entry. Add products faster using
          images and smart tools—less typing, fewer errors.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Image-based entry</strong>. Create or update products from
            photos—titles, descriptions, and more, with less manual input.
          </li>
          <li>
            <strong>Inventory updates</strong>. Keep stock levels in sync
            quickly and avoid overselling or outdated counts.
          </li>
          <li>
            <strong>Built for Shopify</strong>. Works inside your admin so your
            team can use it without leaving Shopify.
          </li>
        </ul>
      </div>
    </div>
  );
}
