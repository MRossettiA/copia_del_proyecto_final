import ICandidate from "./ICandidate"

interface ICampaign {
    id?: string;
    name: string;
    description: string;
    location: string;
    date: Date;
    userId:string
    user: {
      id: string;
      name: string;
      dni: number;
      email: string;
      password?: string;
      address?: string;
      city?: string;
      country?: string;
      suffrage?: boolean;
      isFirstLogin?: boolean;
    };
    candidates?: Array<ICandidate>;
  }
  
  export default ICampaign;
  