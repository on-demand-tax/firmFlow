export default function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">문의</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          FirmFlow 도입 및 서비스 관련 문의는 아래 이메일로 연락해 주세요.
        </p>
        <p className="mt-8">
          <a
            href="mailto:contact@yourfirm.com"
            className="text-lg font-medium text-primary underline-offset-4 hover:underline"
          >
            contact@yourfirm.com
          </a>
        </p>
      </div>
    </section>
  );
}
