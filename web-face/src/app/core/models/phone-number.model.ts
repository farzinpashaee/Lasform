import { PhoneNumberType } from './enums';

export interface PhoneNumber {
  type: PhoneNumberType;
  countryCode?: string;
  number: string;
  extension?: string;
}
