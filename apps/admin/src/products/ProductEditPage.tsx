import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { adminApi, describeError, productsApi, type ProductInput } from '@shopflow/api';
import { routes, toast, toastError } from '@shopflow/shared';
import { ErrorState, PageHeader, Spinner } from '@shopflow/ui';
import { card, textLink } from '../format';
import { FlashSalePanel } from './FlashSalePanel';
import { ImagesPanel } from './ImagesPanel';
import { ProductForm } from './ProductForm';
import { StockPanel } from './StockPanel';

/** /admin/products/new (create) or /admin/products/:id (edit + images, stock, sale). */
export function ProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const product = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: ({ signal }) => productsApi.get(id!, signal),
    enabled: !!id,
  });

  const create = useMutation({
    mutationFn: (input: ProductInput) => adminApi.products.create(input),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast({ kind: 'success', message: 'Product created. Now add images and stock.' });
      navigate(routes.adminProduct(p.id), { replace: true });
    },
    onError: toastError,
  });
  const update = useMutation({
    mutationFn: (input: ProductInput) => adminApi.products.update(id!, product.data!.version, input),
    onSuccess: (p) => {
      qc.setQueryData(['admin', 'product', id], p);
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast({ kind: 'success', message: 'Saved' });
    },
    onError: toastError, // 409 "changed by someone else": reload and edit again
  });

  const back = (
    <Link to={routes.adminProducts} className={`${textLink} adm:mt-4 adm:inline-flex adm:items-center adm:gap-1 adm:text-sm`}>
      <ArrowLeft className="adm:size-4" aria-hidden /> All products
    </Link>
  );

  if (!id) {
    return (
      <>
        {back}
        <PageHeader title="New product" subtitle="Images, stock and sales come after it is created." />
        <div className={card}>
          <ProductForm saving={create.isPending} onSave={(input) => create.mutate(input)} />
        </div>
      </>
    );
  }

  if (product.isPending) {
    return (
      <div className="adm:grid adm:min-h-60 adm:place-items-center">
        <Spinner label="Loading the product" />
      </div>
    );
  }
  if (product.isError) {
    const { message, reference } = describeError(product.error);
    return <ErrorState text={message} reference={reference} onRetry={() => void product.refetch()} />;
  }

  const p = product.data;
  return (
    <>
      {back}
      <PageHeader
        title={p.name}
        subtitle={
          <Link to={routes.product(p.slug)} className={textLink}>
            View in the shop
          </Link>
        }
      />
      <div className="adm:grid adm:gap-6 adm:lg:grid-cols-[2fr_1fr]">
        <div className={card}>
          {/* key: after a save (new version) the form starts from the saved values */}
          <ProductForm key={p.version} product={p} saving={update.isPending} onSave={(input) => update.mutate(input)} />
        </div>
        <div className="adm:flex adm:flex-col adm:gap-6">
          <StockPanel productId={p.id} />
          <FlashSalePanel productId={p.id} />
        </div>
        <div className="adm:lg:col-span-2">
          <ImagesPanel product={p} />
        </div>
      </div>
    </>
  );
}
