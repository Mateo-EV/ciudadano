type VerificationEmailProps = {
  code: string;
};

export default function VerificationEmail({ code }: VerificationEmailProps) {
  return (
    <div>
      <h1>Verificar Email</h1>
      <p>Tu código de verificación es: {code}</p>
    </div>
  );
}
