type PasswordResetEmailProps = {
  code: string;
};

export default function PasswordResetEmail({ code }: PasswordResetEmailProps) {
  return (
    <div>
      <h1>Resetear Contraseña</h1>
      <p>Tu código de verificación es: {code}</p>
    </div>
  );
}
