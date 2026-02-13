
import { Metadata } from 'next';
import Link from 'next/link';
import { ActivateForm } from '@/components/forms/ActivateForm';

export const metadata: Metadata = {
    title: 'Activate Account - CBT System',
    description: 'Activate your CBT account by setting up your password',
};

export default function ActivatePage() {
    return (
        <>
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Activate Your Account
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your matric number or file number and create a password to get started.
                </p>
            </div>
            <ActivateForm />
            <p className="px-8 text-center text-sm text-muted-foreground">
                <Link
                    href="/login"
                    className="hover:text-brand underline underline-offset-4"
                >
                    Already activated? Sign in &rarr;
                </Link>
            </p>
        </>
    );
}
