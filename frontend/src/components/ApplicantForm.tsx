'use client';

import { Controller, useForm } from 'react-hook-form';
import { Applicant } from '@/lib/types';
import { Button, Checkbox, Field, Input, Textarea } from '@/components/ui';
import { CountrySelect } from '@/components/CountrySelect';
import { MediaOrgSelect } from '@/components/MediaOrgSelect';

export interface ApplicantFormValues {
  lastName: string;
  firstName: string;
  middleName?: string;
  mediaId?: string;
  position?: string;
  employerAddress?: string;
  citizenshipCountryId?: string;
  visitedBefore?: boolean;
  visitPurpose?: string;
  tripStart?: string;
  tripEnd?: string;
  accommodation?: string;
  phone?: string;
  email?: string;
  passportNumber?: string;
  passportExpiry?: string;
  visaFree?: boolean;
  visaNumber?: string;
  visaExpiry?: string;
  noPressCard?: boolean;
  pressCardExpiry?: string;
  priorCoverageLinks?: string;
}

function toDateInputValue(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

// Сравнение строк дат вида "YYYY-MM-DD" лексикографически эквивалентно сравнению по времени —
// отдельный Date() здесь не нужен. Используется для live-подсказок об истёкших сроках,
// зеркалит правила бэкенда (ApplicationsService.validateApplicantForSubmission).
function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

const expiredBorderClass = 'border-seal-dark focus:ring-seal-dark/40 focus:border-seal-dark';

function defaultsFromApplicant(a?: Applicant): Partial<ApplicantFormValues> {
  if (!a) return { visitedBefore: false, visaFree: false, noPressCard: false };
  return {
    lastName: a.lastName,
    firstName: a.firstName,
    middleName: a.middleName ?? undefined,
    mediaId: a.mediaId ?? undefined,
    position: a.position ?? undefined,
    employerAddress: a.employerAddress ?? undefined,
    citizenshipCountryId: a.citizenshipCountryId ?? undefined,
    visitedBefore: a.visitedBefore,
    visitPurpose: a.visitPurpose ?? undefined,
    tripStart: toDateInputValue(a.tripStart),
    tripEnd: toDateInputValue(a.tripEnd),
    accommodation: a.accommodation ?? undefined,
    phone: a.phone ?? undefined,
    email: a.email ?? undefined,
    passportNumber: a.passportNumber ?? undefined,
    passportExpiry: toDateInputValue(a.passportExpiry),
    visaFree: a.visaFree,
    visaNumber: a.visaNumber ?? undefined,
    visaExpiry: toDateInputValue(a.visaExpiry),
    noPressCard: a.noPressCard,
    pressCardExpiry: toDateInputValue(a.pressCardExpiry),
    priorCoverageLinks: a.priorCoverageLinks ?? undefined,
  };
}

function sanitize(values: ApplicantFormValues): ApplicantFormValues {
  // Скрытые поля (visaExpiry/pressCardExpiry при visaFree/noPressCard) и несделанные выборы
  // в селектах (значение "" у "— не выбрано —") react-hook-form всё равно отправляет как
  // пустую строку. Бэкенд же с @IsOptional() пропускает поле только если оно undefined —
  // пустая строка "" валится на @IsDateString()/@IsUUID(). Поэтому чистим "" -> undefined.
  const result = { ...values } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (result[key] === '') result[key] = undefined;
  }
  return result as unknown as ApplicantFormValues;
}

export function ApplicantForm({
  applicant,
  editable,
  saving,
  onSubmit,
}: {
  applicant?: Applicant;
  editable: boolean;
  saving?: boolean;
  onSubmit: (values: ApplicantFormValues) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ApplicantFormValues>({ defaultValues: defaultsFromApplicant(applicant) });

  const visaFree = watch('visaFree');
  const noPressCard = watch('noPressCard');
  const passportExpiry = watch('passportExpiry');
  const visaExpiry = watch('visaExpiry');
  const pressCardExpiry = watch('pressCardExpiry');
  const tripStart = watch('tripStart');
  const tripEnd = watch('tripEnd');

  const today = todayInputValue();
  const passportExpired = !!passportExpiry && passportExpiry < today;
  const visaExpired = !visaFree && !!visaExpiry && visaExpiry < today;
  const pressCardExpired = !noPressCard && !!pressCardExpiry && pressCardExpiry < today;
  const tripDatesInvalid = !!tripStart && !!tripEnd && tripStart > tripEnd;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(sanitize(values)))} className="flex flex-col gap-8">
      <fieldset disabled={!editable} className="flex flex-col gap-8 disabled:opacity-70">
        <section className="grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-serif text-base border-b border-border pb-2">Личные данные</h3>
          <Field label="Фамилия" htmlFor="lastName" error={errors.lastName?.message}>
            <Input id="lastName" {...register('lastName', { required: 'Обязательное поле' })} />
          </Field>
          <Field label="Имя" htmlFor="firstName" error={errors.firstName?.message}>
            <Input id="firstName" {...register('firstName', { required: 'Обязательное поле' })} />
          </Field>
          <Field label="Отчество" htmlFor="middleName">
            <Input id="middleName" {...register('middleName')} />
          </Field>
          <Field label="Гражданство" htmlFor="citizenshipCountryId">
            <Controller
              name="citizenshipCountryId"
              control={control}
              render={({ field }) => (
                <CountrySelect id="citizenshipCountryId" value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
          <Field label="Телефон" htmlFor="phone">
            <Input id="phone" {...register('phone')} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" {...register('email')} />
          </Field>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-serif text-base border-b border-border pb-2">Организация и цель визита</h3>
          <div className="col-span-2">
            <Field label="Организация" htmlFor="mediaId">
              <Controller
                name="mediaId"
                control={control}
                render={({ field }) => <MediaOrgSelect id="mediaId" value={field.value} onChange={field.onChange} />}
              />
            </Field>
          </div>
          <Field label="Должность" htmlFor="position">
            <Input id="position" {...register('position')} />
          </Field>
          <Field label="Адрес редакции" htmlFor="employerAddress">
            <Input id="employerAddress" {...register('employerAddress')} />
          </Field>
          <div className="col-span-2">
            <Field label="Цель визита" htmlFor="visitPurpose">
              <Textarea id="visitPurpose" rows={2} {...register('visitPurpose')} />
            </Field>
          </div>
          <div className="col-span-2">
            <Checkbox label="Ранее уже посещал(а) Абхазию" {...register('visitedBefore')} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-serif text-base border-b border-border pb-2">Поездка</h3>
          <Field
            label="Дата начала"
            htmlFor="tripStart"
            error={tripDatesInvalid ? 'Дата начала позже даты окончания' : undefined}
          >
            <Input
              id="tripStart"
              type="date"
              className={tripDatesInvalid ? expiredBorderClass : ''}
              {...register('tripStart')}
            />
          </Field>
          <Field label="Дата окончания" htmlFor="tripEnd">
            <Input
              id="tripEnd"
              type="date"
              className={tripDatesInvalid ? expiredBorderClass : ''}
              {...register('tripEnd')}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Место проживания" htmlFor="accommodation">
              <Input id="accommodation" placeholder="Гостиница, адрес…" {...register('accommodation')} />
            </Field>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-serif text-base border-b border-border pb-2">Паспорт и виза</h3>
          <Field label="Номер паспорта" htmlFor="passportNumber">
            <Input id="passportNumber" {...register('passportNumber')} />
          </Field>
          <Field
            label="Срок действия паспорта"
            htmlFor="passportExpiry"
            error={passportExpired ? 'Срок действия паспорта истёк' : undefined}
          >
            <Input
              id="passportExpiry"
              type="date"
              className={passportExpired ? expiredBorderClass : ''}
              {...register('passportExpiry')}
            />
          </Field>
          <div className="col-span-2">
            <Checkbox label="Безвизовый режим" {...register('visaFree')} />
          </div>
          {!visaFree && (
            <>
              <Field label="Номер визы" htmlFor="visaNumber">
                <Input id="visaNumber" {...register('visaNumber')} />
              </Field>
              <Field
                label="Срок действия визы"
                htmlFor="visaExpiry"
                error={visaExpired ? 'Срок действия визы истёк' : undefined}
              >
                <Input
                  id="visaExpiry"
                  type="date"
                  className={visaExpired ? expiredBorderClass : ''}
                  {...register('visaExpiry')}
                />
              </Field>
            </>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-serif text-base border-b border-border pb-2">Пресс-карта</h3>
          <div className="col-span-2">
            <Checkbox label="Пресс-карта отсутствует" {...register('noPressCard')} />
          </div>
          {!noPressCard && (
            <Field
              label="Срок действия пресс-карты"
              htmlFor="pressCardExpiry"
              error={pressCardExpired ? 'Срок действия пресс-карты истёк' : undefined}
            >
              <Input
                id="pressCardExpiry"
                type="date"
                className={pressCardExpired ? expiredBorderClass : ''}
                {...register('pressCardExpiry')}
              />
            </Field>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4">
          <h3 className="font-serif text-base border-b border-border pb-2">Публикации по Абхазии ранее</h3>
          <Field label="Ссылки на публикации (по одной на строку)" htmlFor="priorCoverageLinks">
            <Textarea id="priorCoverageLinks" rows={3} {...register('priorCoverageLinks')} />
          </Field>
        </section>

        {editable && (
          <Button type="submit" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить анкету'}
          </Button>
        )}
      </fieldset>
    </form>
  );
}
