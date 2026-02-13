
import { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/forms/LoginForm';

export const metadata: Metadata = {
    title: 'Login - CBT System',
    description: 'Sign in to your CBT account',
};

export default function LoginPage() {
    return (
        <>
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your matric number, file number, or email to sign in
                </p>
            </div>
            <LoginForm />
            <p className="px-8 text-center text-sm text-muted-foreground">
                <Link
                    href="/activate"
                    className="hover:text-brand underline underline-offset-4"
                >
                    First time? Activate your account &rarr;
                </Link>
            </p>
        </>
    );
}
