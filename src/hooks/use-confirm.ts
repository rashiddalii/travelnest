import { useModalStore, ConfirmModalOptions } from "@/lib/store/modal-store";

export function useConfirm() {
  const openConfirm = useModalStore((state) => state.openConfirm);

  const confirm = async (options: ConfirmModalOptions): Promise<boolean> => {
    return openConfirm(options);
  };

  return { confirm };
}
