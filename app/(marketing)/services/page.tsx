export default function ServicesPage() {
  const services = [
    {
      title: '시간 기록 관리',
      description: '고객·프로젝트별 청구 가능 시간을 기록하고 승인 워크플로를 지원합니다.',
    },
    {
      title: '경비 관리',
      description: '프로젝트 직접비와 간접비를 구분하여 영수증과 함께 관리합니다.',
    },
    {
      title: 'Google Drive 연동',
      description: '고객별 문서 폴더를 자동 생성하고 Drive와 연동합니다.',
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">업무</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          FirmFlow가 지원하는 핵심 업무 영역입니다.
        </p>
        <ul className="mt-10 space-y-8">
          {services.map((service) => (
            <li key={service.title} className="border-l-2 border-primary pl-6">
              <h2 className="text-lg font-semibold text-foreground">{service.title}</h2>
              <p className="mt-2 text-muted-foreground">{service.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
