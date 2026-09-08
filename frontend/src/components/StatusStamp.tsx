import {
  APPLICANT_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
  ApplicantStatus,
  ApplicationStatus,
} from '@/lib/types';

const COLORS: Record<string, string> = {
  draft: 'text-ink-soft',
  new: 'text-ink-soft',
  submitted: 'text-primary',
  in_review: 'text-primary',
  approved: 'text-green-700',
  rejected: 'text-seal-dark',
};

export function StatusStamp({ status, kind }: { status: ApplicationStatus | ApplicantStatus; kind: 'application' | 'applicant' }) {
  const label =
    kind === 'application'
      ? APPLICATION_STATUS_LABELS[status as ApplicationStatus]
      : APPLICANT_STATUS_LABELS[status as ApplicantStatus];

  return <span className={`stamp ${COLORS[status] ?? 'text-ink-soft'}`}>{label}</span>;
}
