import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SnakeGame from "@/pages/SnakeGame";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SnakeGame />
    </QueryClientProvider>
  );
}

export default App;
