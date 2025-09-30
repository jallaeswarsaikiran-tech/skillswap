// Redirect legacy /auth/login to the canonical /signin page
import { redirect } from 'next/navigation';

export default function LoginRedirect() {
  redirect('/signin');
}
