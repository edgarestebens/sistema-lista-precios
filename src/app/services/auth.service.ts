import { Inject, Injectable, signal } from '@angular/core';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly user = signal<User | null>(null);
  readonly ready = signal(false);

  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {
    void this.init();
  }

  private async init(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.setSession(data.session);

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);
    });

    this.ready.set(true);
  }

  private setSession(session: Session | null): void {
    this.session.set(session);
    this.user.set(session?.user ?? null);
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }

  async signUp(email: string, password: string, fullName?: string): Promise<void> {
    const { error } = await this.supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName?.trim() || email.trim().split('@')[0],
        },
      },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }
}
