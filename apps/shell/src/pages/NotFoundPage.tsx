import { useNavigate } from 'react-router';
import { routes } from '@shopflow/shared';
import { Button, NotFound } from '@shopflow/ui';

export function NotFoundPage() {
  const navigate = useNavigate();
  return <NotFound action={<Button onClick={() => navigate(routes.home)}>Go to shop</Button>} />;
}
