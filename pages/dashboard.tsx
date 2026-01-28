import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Dashboard is now part of /chat - redirect for backwards compatibility
export default function Dashboard() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/chat');
    }, [router]);

    return null;
}
