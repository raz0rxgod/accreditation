'use client';

import { useRequireAuth } from '@/lib/useRequireAuth';
import { DashboardShell } from '@/components/DashboardShell';
import { Card } from '@/components/ui';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <h2 className="font-serif text-lg mb-3">{title}</h2>
      <div className="text-sm text-ink space-y-2">{children}</div>
    </Card>
  );
}

// TODO: заменить контакты-заглушки на реальные перед выпуском в прод —
// сейчас это плейсхолдеры для вёрстки.
const CONTACT_PHONE = '+7 (000) 000-00-00';
const CONTACT_PHONE_TEL = '+70000000000';
const CONTACT_EMAIL = 'accreditation@example.com';

export default function ApplicantInfoPage() {
  const ready = useRequireAuth();
  if (!ready) return null;

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl mb-6">Памятка заявителю</h1>

      <Section title="Перед поездкой">
        <p>
          Убедитесь, что анкета каждого участника заполнена полностью, а сроки действия
          паспорта, визы (если требуется) и пресс-карты не истекают раньше даты окончания
          поездки. Заявка, содержащая просроченные документы, не будет принята к рассмотрению.
        </p>
        <p>
          Загрузите фото для бейджа — оно печатается на аккредитационной карте и должно быть
          портретом анфас, без головных уборов и очков с тёмными стёклами.
        </p>
      </Section>

      <Section title="На границе и при переезде по стране">
        <p>
          После одобрения анкеты в личном кабинете появится PDF-бейдж с QR-кодом. Его можно
          показать с экрана телефона или распечатать — код проверяется отдельно от бумажного
          вида и остаётся действительным в любом случае.
        </p>
        <p>
          Если вы декларируете съёмочную или иную технику, сгенерируйте групповой QR-код
          техники в разделе заявки — предъявите его на таможне вместе с личным бейджем.
        </p>
      </Section>

      <Section title="Во время визита">
        <ul className="list-disc pl-5 space-y-1">
          <li>Аккредитационная карта действительна только на срок, указанный в заявке.</li>
          <li>Съёмка охраняемых и режимных объектов требует отдельного согласования — уточняйте у сопровождающего.</li>
          <li>Изменения в составе группы или маршруте обсуждайте с администрацией портала через чат заявки в личном кабинете.</li>
        </ul>
      </Section>

      <Section title="После поездки">
        <p>
          Ссылки на опубликованные материалы можно будет прикрепить к заявке — это ускоряет
          рассмотрение будущих обращений от вашей организации.
        </p>
      </Section>

      <Section title="Контакты">
        <p>
          Служба по работе с заявителями:
        </p>
        <p>
          Телефон:{' '}
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="text-primary hover:underline">
            {CONTACT_PHONE}
          </a>
        </p>
        <p>
          Email:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="text-xs text-ink-soft">
          По конкретной заявке быстрее всего писать в чат внутри неё — сообщения приходят
          сотруднику, который её рассматривает.
        </p>
      </Section>
    </DashboardShell>
  );
}
