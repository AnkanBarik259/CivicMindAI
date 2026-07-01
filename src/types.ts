export interface User {
  uid: string;
  role: 'citizen' | 'authority' | 'admin';
  name: string;
  trustScore: number;
  createdAt: Date;
}

export interface Issue {
  id: string;
  reporterUid: string;
  location: { lat: number; lng: number };
  images: string[];
  description: string;
  status: 'reported' | 'analyzing' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  departmentId: string;
  severityScore: number;
  upvotes: number;
  aiMetadata?: any;
}
