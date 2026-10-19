import { useState, type FormEvent } from 'react';
import type { Product, ProductInput } from '@shopflow/api';
import { Button, Input } from '@shopflow/ui';
import {
  attributesToText,
  field,
  KNOWN_CATEGORIES,
  paiseToRupees,
  rupeesToPaise,
  slugify,
  textToAttributes,
} from '../format';

type Errors = Partial<Record<'name' | 'slug' | 'category' | 'price', string>>;

/** Create or edit the product's fields. Images, stock and sales are separate panels. */
export function ProductForm({
  product,
  saving,
  onSave,
}: {
  product?: Product;
  saving: boolean;
  onSave: (input: ProductInput) => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [category, setCategory] = useState(product?.category ?? '');
  const [price, setPrice] = useState(product ? paiseToRupees(product.pricePaise) : '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [attributes, setAttributes] = useState(attributesToText(product?.attributes));
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const pricePaise = rupeesToPaise(price);
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'At least 2 characters';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2) next.slug = 'Like "my-product-1": lowercase letters, digits and dashes';
    if (!/^[a-z][a-z0-9-]{1,49}$/.test(category)) next.category = 'One lowercase word, e.g. phones';
    if (Number.isNaN(pricePaise)) next.price = 'A price in rupees, e.g. 1299 or 1299.50';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({
      name: name.trim(),
      slug,
      category,
      pricePaise,
      description: description.trim(),
      attributes: textToAttributes(attributes),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="adm:grid adm:gap-4 adm:sm:grid-cols-2">
      <Input
        label="Name"
        value={name}
        error={errors.name}
        onChange={(e) => {
          setName(e.target.value);
          if (!slugTouched) setSlug(slugify(e.target.value));
        }}
        required
      />
      <Input
        label="Slug (the URL)"
        value={slug}
        error={errors.slug}
        hint={slug ? `/products/${slug}` : undefined}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value.toLowerCase());
        }}
        required
      />
      <Input
        label="Category"
        value={category}
        error={errors.category}
        list="admin-categories"
        onChange={(e) => setCategory(e.target.value.toLowerCase().trim())}
        required
      />
      <datalist id="admin-categories">
        {KNOWN_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Input
        label="Price (₹)"
        inputMode="decimal"
        value={price}
        error={errors.price}
        onChange={(e) => setPrice(e.target.value)}
        required
      />
      <div className="adm:flex adm:flex-col adm:gap-1.5 adm:sm:col-span-2">
        <label htmlFor="admin-description" className="adm:text-sm adm:font-medium adm:text-ink">
          Description
        </label>
        <textarea
          id="admin-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={field}
        />
      </div>
      <div className="adm:flex adm:flex-col adm:gap-1.5 adm:sm:col-span-2">
        <label htmlFor="admin-attributes" className="adm:text-sm adm:font-medium adm:text-ink">
          Specifications
        </label>
        <textarea
          id="admin-attributes"
          rows={3}
          value={attributes}
          placeholder={'ram: 8GB\nstorage: 128GB'}
          aria-describedby="admin-attributes-hint"
          onChange={(e) => setAttributes(e.target.value)}
          className={`${field} adm:font-mono`}
        />
        <p id="admin-attributes-hint" className="adm:text-xs adm:text-muted">
          One per line, as "name: value".
        </p>
      </div>
      <div className="adm:sm:col-span-2">
        <Button type="submit" loading={saving}>
          {product ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
