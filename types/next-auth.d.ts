import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      userId: string;
      role: 'Admin' | 'Approver' | 'Preparer';
      status: 'Active' | 'OnLeave' | 'Terminated';
      email: string;
      name: string;
    };
  }

  interface User {
    id: string;
    role?: 'Admin' | 'Approver' | 'Preparer';
    status?: 'Active' | 'OnLeave' | 'Terminated';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: 'Admin' | 'Approver' | 'Preparer';
    status?: 'Active' | 'OnLeave' | 'Terminated';
  }
}
