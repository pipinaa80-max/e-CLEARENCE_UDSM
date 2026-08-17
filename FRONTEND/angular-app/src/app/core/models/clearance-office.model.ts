export interface ClearanceOffice {
  id: string;
  name: string;
  description: string;
  order: number;
  status: 'Active' | 'Inactive';
}
