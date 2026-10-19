import { useState, type FormEvent } from 'react';
import type { AddressInput } from '@shopflow/api';
import { Button, Input } from '@shopflow/ui';

export const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

type Field = 'fullName' | 'phone' | 'line1' | 'city' | 'state' | 'pincode';

/** The same rules as the backend (user + order services). */
export function validateAddress(a: AddressInput): Partial<Record<Field, string>> {
  const phone = a.phone.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
  const e: Partial<Record<Field, string>> = {};
  if (a.fullName.trim().length < 2) e.fullName = 'Enter the name of the person receiving it';
  if (!/^[6-9]\d{9}$/.test(phone)) e.phone = 'Enter a 10-digit mobile number';
  if (a.line1.trim().length < 3) e.line1 = 'Enter the house / flat and street';
  if (a.city.trim().length < 2) e.city = 'Enter the city';
  if (a.state.trim().length < 2) e.state = 'Choose the state';
  if (!/^[1-9]\d{5}$/.test(a.pincode.trim())) e.pincode = 'Enter a 6-digit PIN code';
  return e;
}

const empty: AddressInput = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

/** New delivery address. Saved to the address book, then used for this order. */
export function AddressForm({
  initialName = '',
  saving,
  onSave,
  onCancel,
}: {
  initialName?: string;
  saving: boolean;
  onSave: (input: AddressInput) => void;
  onCancel?: () => void;
}) {
  const [a, setA] = useState<AddressInput>({ ...empty, fullName: initialName });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const set = (k: keyof AddressInput) => (e: { target: { value: string } }) => setA((v) => ({ ...v, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = validateAddress(a);
    setErrors(next);
    if (Object.keys(next).length === 0) onSave(a);
  };

  return (
    <form onSubmit={submit} noValidate aria-label="New delivery address" className="chk:mt-3 chk:grid chk:gap-3 chk:sm:grid-cols-2">
      <Input label="Full name" autoComplete="name" value={a.fullName} error={errors.fullName} onChange={set('fullName')} />
      <Input label="Mobile number" type="tel" inputMode="tel" autoComplete="tel-national" value={a.phone} error={errors.phone} onChange={set('phone')} />
      <div className="chk:sm:col-span-2">
        <Input label="House / flat, building, street" autoComplete="address-line1" value={a.line1} error={errors.line1} onChange={set('line1')} />
      </div>
      <div className="chk:sm:col-span-2">
        <Input label="Area, landmark (optional)" autoComplete="address-line2" value={a.line2 ?? ''} onChange={set('line2')} />
      </div>
      <Input label="City" autoComplete="address-level2" value={a.city} error={errors.city} onChange={set('city')} />
      <Input label="State" list="checkout-states" autoComplete="address-level1" value={a.state} error={errors.state} onChange={set('state')} />
      <datalist id="checkout-states">
        {STATES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <Input label="PIN code" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={a.pincode} error={errors.pincode} onChange={set('pincode')} />
      <div className="chk:flex chk:items-end chk:gap-2 chk:sm:col-span-2">
        <Button type="submit" loading={saving}>
          Save and deliver here
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
