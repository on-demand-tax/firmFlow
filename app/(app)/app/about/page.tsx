import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_VERSION, CHANGELOG, LAUNCH_DATE } from '@/lib/changelog';

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">정보</h1>
          <Badge variant="secondary">v{APP_VERSION}</Badge>
        </div>
        <p className="mt-1 text-muted-foreground">
          FirmFlow 내부 업무 관리 시스템 · 배포일 {formatDate(LAUNCH_DATE)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>소개</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground">
          <p>
            FirmFlow는 직원 5~15명 규모의 소형 회계법인을 위해 설계된 내부 관리
            웹 애플리케이션입니다.
          </p>
          <p>
            고객별 청구 가능 시간, 프로젝트 경비, 기본 HR 이력을 체계적으로 추적하여
            업무 효율과 데이터 무결성을 높입니다.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">변경 이력</h2>
        {CHANGELOG.map((entry) => (
          <Card key={`${entry.version}-${entry.date}`}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{entry.title}</CardTitle>
                <Badge variant="outline">v{entry.version}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{formatDate(entry.date)}</p>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
