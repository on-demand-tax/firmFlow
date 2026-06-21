export default function AboutPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">소개</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          FirmFlow는 직원 5~15명 규모의 소형 회계법인을 위해 설계된
          내부 관리 웹 애플리케이션입니다.
        </p>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          고객별 청구 가능 시간, 프로젝트 경비, 기본 HR 이력을
          체계적으로 추적하여 업무 효율과 데이터 무결성을 높입니다.
        </p>
      </div>
    </section>
  );
}
