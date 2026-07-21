import PedidoForm from "@/components/PedidoForm";

export default function EditarPedidoPage({ params }: { params: { id: string } }) {
  return <PedidoForm pedidoId={params.id} />;
}
