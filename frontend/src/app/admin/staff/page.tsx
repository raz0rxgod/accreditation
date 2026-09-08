'use client';

import { useEffect, useState } from 'react';
import { useRequireStaffAuth } from '@/lib/useRequireStaffAuth';
import { AdminShell } from '@/components/AdminShell';
import { Alert, Button, Card, Field, Input, Select } from '@/components/ui';
import { staffApi } from '@/lib/staffApi';
import { apiErrorMessage } from '@/lib/api';
import { StaffRole, StaffUser, STAFF_ROLE_LABELS } from '@/lib/types';

const ROLES = Object.keys(STAFF_ROLE_LABELS) as StaffRole[];

export default function StaffManagementPage() {
  const ready = useRequireStaffAuth(['admin']);

  const [staff, setStaff] = useState<StaffUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('mfa_officer');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = () =>
    staffApi
      .get<StaffUser[]>('/staff')
      .then((res) => setStaff(res.data))
      .catch((e) => setError(apiErrorMessage(e, 'Не удалось загрузить список сотрудников')));

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;

  const createStaff = async () => {
    setCreateError(null);
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setCreateError('Заполните ФИО, email и пароль (не короче 8 символов)');
      return;
    }
    setCreating(true);
    try {
      await staffApi.post('/staff', { fullName: fullName.trim(), email: email.trim(), password, role });
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('mfa_officer');
      await load();
    } catch (e) {
      setCreateError(apiErrorMessage(e, 'Не удалось создать сотрудника'));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (member: StaffUser) => {
    setBusyId(member.id);
    setError(null);
    try {
      await staffApi.patch(`/staff/${member.id}`, { active: !member.active });
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось изменить статус сотрудника'));
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (member: StaffUser, newRole: StaffRole) => {
    setBusyId(member.id);
    setError(null);
    try {
      await staffApi.patch(`/staff/${member.id}`, { role: newRole });
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось изменить роль сотрудника'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-2xl mb-6">Сотрудники Министерства иностранных дел Республики Абхазия</h1>

      <Card className="mb-6">
        <h2 className="font-serif text-lg mb-4">Новый сотрудник</h2>
        {createError && (
          <div className="mb-3">
            <Alert>{createError}</Alert>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="ФИО" htmlFor="new-staff-name">
            <Input id="new-staff-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="new-staff-email">
            <Input id="new-staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Пароль" htmlFor="new-staff-password">
            <Input
              id="new-staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Не короче 8 символов"
            />
          </Field>
          <Field label="Роль" htmlFor="new-staff-role">
            <Select id="new-staff-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {STAFF_ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button onClick={createStaff} disabled={creating}>
          {creating ? 'Создаём…' : 'Создать сотрудника'}
        </Button>
      </Card>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card>
        <h2 className="font-serif text-lg mb-4">Все сотрудники</h2>
        {staff === null && <p className="text-sm text-ink-soft">Загрузка…</p>}
        {staff && staff.length === 0 && <p className="text-sm text-ink-soft">Сотрудников пока нет.</p>}
        {staff && staff.length > 0 && (
          <div className="flex flex-col gap-2">
            {staff.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between border border-border rounded-md px-3 py-2 text-sm"
              >
                <div>
                  <div className={member.active ? '' : 'text-ink-soft line-through'}>{member.fullName}</div>
                  <div className="text-xs text-ink-soft">{member.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={member.role}
                    disabled={busyId === member.id}
                    onChange={(e) => changeRole(member, e.target.value as StaffRole)}
                    className="w-auto text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {STAFF_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant={member.active ? 'danger' : 'secondary'}
                    disabled={busyId === member.id}
                    onClick={() => toggleActive(member)}
                  >
                    {member.active ? 'Деактивировать' : 'Активировать'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
