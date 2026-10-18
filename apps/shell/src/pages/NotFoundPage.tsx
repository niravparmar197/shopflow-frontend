import { useNavigate } from 'react-router';
import { SearchX } from 'lucide-react';
import { routes } from '@shopflow/shared';
import { Button, Container, EmptyState } from '@shopflow/ui';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Container>
      <EmptyState
        icon={<SearchX className="size-7" aria-hidden />}
        title="Page not found"
        text="The page you are looking for does not exist or has moved."
        action={<Button onClick={() => navigate(routes.home)}>Go to shop</Button>}
      />
    </Container>
  );
}
