export type UserRole = 'admin' | 'jefe_calle' | 'vecino';

export interface UserProfile {
  uid: string;
  firstName: string;
  secondName?: string;
  firstSurname: string;
  secondSurname?: string;
  cedula: string;
  phone: string;
  age: number;
  street: string;
  houseNumber: string;
  gender: 'Masculino' | 'Femenino';
  role: UserRole | 'eliminado';
  email: string;
  createdAt: string;
  isBlocked: boolean;
  lockoutUntil?: string;
  photoUrl?: string | null;
  isBolsaDelivered?: boolean;
  deliveryHistory?: string[];
  sector?: string;
  householdId?: string;
  // Census & Service fields
  medicalConditions?: string;
  disability?: string;
  householdSize?: number;
  clapStatus?: 'al_dia' | 'pendiente';
  gasStatus?: 'al_dia' | 'pendiente';
  waterStatus?: 'al_dia' | 'con_fallas';
  censusUpdatedAt?: any;
  childrenCount?: number;
  adolescentCount?: number;
  livesAlone?: boolean;
  spouseDetails?: {
    firstName: string;
    lastName: string;
    age: number;
    cedula: string;
  };
  childrenDetails?: Array<{
    firstName: string;
    lastName: string;
    age: number;
    cedula?: string;
  }>;
  elderlyDetails?: Array<{
    firstName: string;
    lastName: string;
    age: number;
    cedula: string;
    condition: string;
  }>;
  participationHistory?: Array<{
    eventId: string;
    date: any;
    title: string;
    type: string;
  }>;
}

export interface HouseholdMember {
  uid: string;
  name: string;
  cedula: string;
  age: number;
  gender: 'Masculino' | 'Femenino';
  isHead: boolean;
  tags: string[];
}

export interface Household {
  id: string;
  houseNumber: string;
  street: string;
  sector: string;
  members: HouseholdMember[];
  gasStatus: 'al_dia' | 'pendiente';
  clapStatus: 'al_dia' | 'pendiente';
  waterStatus: 'al_dia' | 'con_fallas';
  updatedAt: any;
  createdAt: any;
}

export interface CensusRecord {
  id: string;
  userId: string;
  user?: UserProfile;
  registeredBy: string;
  street: string;
  situation: string;
  benefitsReceived: string[];
  lastUpdated: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  desc: string;
  date: string;
  time: string;
  location: string;
  type: 'evento' | 'jornada';
  capacity: number;
  isUnlimited: boolean;
  deadline?: string;
  instructions?: string;
  registrants: string[];
  registrantsData?: {
    uid: string;
    name: string;
    timestamp: string;
  }[];
  createdAt: any;
}

export interface Survey {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  voters: string[];
  expiresAt: string;
  createdAt: string;
}

export interface RepoDocument {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string;
  createdAt: string;
}
