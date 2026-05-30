-- Profilová tabulka pro zobrazení jmen uživatelů
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Uživatelé vidí profily kolegů ve stejném tenantu
CREATE POLICY "Users can view profiles of their team" ON public.profiles
    FOR SELECT USING (
        id IN (
            SELECT user_id FROM public.tenant_users 
            WHERE tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

-- Admini mohou upravovat profily (pro budoucí použití)
CREATE POLICY "Admins can manage profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tenant_users tu 
            WHERE tu.user_id = auth.uid() 
            AND tu.role = 'admin'
        )
    );
