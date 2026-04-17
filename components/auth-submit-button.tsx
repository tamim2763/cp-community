"use client";

import { useFormStatus } from "react-dom";

type Props = {
  label: string;
  pendingLabel: string;
};

export function AuthSubmitButton({ label, pendingLabel }: Props) {
  const { pending } = useFormStatus();

  return (
    <button className="auth-button" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
