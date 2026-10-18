import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { adminApi, describeError, uploadToStorage, type Product } from '@shopflow/api';
import { toast, toastError } from '@shopflow/shared';
import { Button } from '@shopflow/ui';
import { card } from '../format';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Upload = 3 steps: ask the product service where (a presigned form), send the
 * file STRAIGHT to storage, then confirm so the service attaches it. The big
 * file never goes through the gateway.
 */
export function ImagesPanel({ product }: { product: Product }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const target = await adminApi.products.imageUploadUrl(product.id, file.type, file.size);
      await uploadToStorage(target, file);
      return adminApi.products.confirmImage(product.id, target.key);
    },
    onSuccess: (updated) => {
      qc.setQueryData(['admin', 'product', product.id], updated);
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast({ kind: 'success', message: 'Image added' });
    },
    onError: (err) => {
      // Not an ApiError = the browser could not reach storage (e.g. Stage 1's private MinIO).
      if (err instanceof Error && !('code' in err)) toast({ kind: 'error', message: err.message });
      else toastError(err);
    },
  });

  const pick = (file?: File) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast({ kind: 'error', message: 'Use a JPG, PNG or WebP image' });
    if (file.size > MAX_BYTES) return toast({ kind: 'error', message: 'The image is bigger than 5 MB' });
    upload.mutate(file);
  };

  return (
    <section className={card} aria-labelledby="images-title">
      <h2 id="images-title" className="adm:text-lg adm:font-semibold">
        Images
      </h2>
      {product.images.length === 0 ? (
        <p className="adm:mt-2 adm:text-sm adm:text-muted">No images yet.</p>
      ) : (
        <ul className="adm:mt-3 adm:grid adm:grid-cols-3 adm:gap-3 adm:sm:grid-cols-5">
          {product.images.map((src) => (
            <li key={src}>
              <img src={src} alt="" className="adm:aspect-square adm:w-full adm:rounded-lg adm:border adm:border-line adm:object-cover" />
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        accept={TYPES.join(',')}
        className="adm:sr-only"
        aria-label="Choose an image"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <Button variant="secondary" className="adm:mt-4" loading={upload.isPending} onClick={() => input.current?.click()}>
        <ImagePlus className="adm:size-4" aria-hidden /> Add image
      </Button>
      {upload.isError && (
        <p className="adm:mt-2 adm:text-xs adm:text-muted">
          {describeError(upload.error).message === 'Something went wrong. Please try again.'
            ? 'On Stage 1, uploads need Stage 2 (real S3); locally they work with MinIO.'
            : null}
        </p>
      )}
    </section>
  );
}
