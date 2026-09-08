'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Country } from '@/lib/types';
import { Select } from '@/components/ui';

export function CountrySelect({
  value,
  onChange,
  id,
}: {
  value?: string | null;
  onChange: (id: string) => void;
  id?: string;
}) {
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    api.get<Country[]>('/countries').then((res) => setCountries(res.data));
  }, []);

  return (
    <Select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">— не выбрано —</option>
      {countries.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}
