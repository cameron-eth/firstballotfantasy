import { supabaseServer } from './supabase-server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

export interface UserProfile {
  id: string
  auth_id: string
  username: string
  email: string
  sleeper_username: string | null
  favorite_team: string | null
  sleeper_league_id: string | null
  membership_status: boolean
  feature_access: boolean
  stripe_id: string | null
  created_at: string
  updated_at: string
}

// Create service role client for webhook operations (bypasses RLS)
const supabaseServiceRole = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class UserProfileService {
  /**
   * Create a user profile when a user signs up
   */
  static async createProfile(
    authId: string,
    email: string,
    username: string
  ): Promise<UserProfile> {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabaseServer
        .from('user_profiles')
        .select('id')
        .eq('auth_id', authId)
        .single()

      if (existingProfile) {
        throw new Error('Profile already exists for this user')
      }

      // Create new profile with proper UUID and auth_id linking
      const { data, error } = await supabaseServer
        .from('user_profiles')
        .insert({
          id: uuidv4(), // Generate new UUID for profile
          auth_id: authId, // Link to Supabase auth user
          email: email,
          username: username,
          sleeper_username: null,
          favorite_team: null,
          sleeper_league_id: null,
          membership_status: false,
          feature_access: false,
          stripe_id: null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        throw new Error('Failed to create user profile')
      }

      return data
    } catch (error) {
      console.error('Error in createProfile:', error)
      throw error
    }
  }

  /**
   * Get user profile by auth ID
   */
  static async getProfileByAuthId(authId: string): Promise<UserProfile | null> {
    try {
      console.log('🔍 Looking up profile for auth_id:', authId)

      const { data, error } = await supabaseServer
        .from('user_profiles')
        .select('*')
        .eq('auth_id', authId)
        .single()

      if (error) {
        console.log('❌ Profile lookup error:', error.code, error.message)
        if (error.code !== 'PGRST116') {
          // PGRST116 = no rows returned
          throw error
        }
        return null
      }

      console.log('✅ Profile found:', {
        id: data.id,
        auth_id: data.auth_id,
        email: data.email,
        membership_status: data.membership_status,
      })

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  /**
   * Get user profile by profile ID
   */
  static async getProfileById(profileId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabaseServer
        .from('user_profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching profile by ID:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(authId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const { data, error } = await supabaseServer
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_id', authId)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        throw new Error('Failed to update user profile')
      }

      return data
    } catch (error) {
      console.error('Error in updateProfile:', error)
      throw error
    }
  }

  /**
   * Update sleeper username
   */
  static async updateSleeperUsername(
    authId: string,
    sleeperUsername: string
  ): Promise<UserProfile> {
    return this.updateProfile(authId, { sleeper_username: sleeperUsername })
  }

  /**
   * Update favorite team
   */
  static async updateFavoriteTeam(authId: string, favoriteTeam: string): Promise<UserProfile> {
    return this.updateProfile(authId, { favorite_team: favoriteTeam })
  }

  /**
   * Update sleeper league ID
   */
  static async updateSleeperLeagueId(
    authId: string,
    sleeperLeagueId: string
  ): Promise<UserProfile> {
    return this.updateProfile(authId, { sleeper_league_id: sleeperLeagueId })
  }

  /**
   * Update membership status
   */
  static async updateMembershipStatus(
    authId: string,
    membershipStatus: boolean
  ): Promise<UserProfile> {
    return this.updateProfile(authId, { membership_status: membershipStatus })
  }

  /**
   * Get user profile by email (fallback method)
   */
  static async getProfileByEmail(email: string): Promise<UserProfile | null> {
    try {
      console.log('🔍 Looking up profile for email:', email)

      const { data, error } = await supabaseServer
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        console.log('❌ Email profile lookup error:', error.code, error.message)
        if (error.code !== 'PGRST116') {
          throw error
        }
        return null
      }

      console.log('✅ Email profile found:', {
        id: data.id,
        auth_id: data.auth_id,
        email: data.email,
        membership_status: data.membership_status,
      })

      return data
    } catch (error) {
      console.error('Error fetching profile by email:', error)
      return null
    }
  }

  /**
   * Check if user has active membership
   */
  static async hasActiveMembership(authId: string, email?: string): Promise<boolean> {
    try {
      console.log('🎯 Checking membership for auth_id:', authId)
      console.log('📧 Email fallback available:', email)

      const profile = await this.getProfileByAuthId(authId)

      if (profile) {
        const isMember = profile.membership_status || false
        console.log('✅ Profile found by auth_id - Membership result:', isMember)
        console.log('🔍 Profile details:', {
          profileId: profile.id,
          profileAuthId: profile.auth_id,
          profileEmail: profile.email,
          membershipStatus: profile.membership_status,
          authIdMatches: profile.auth_id === authId,
        })
        return isMember
      }

      console.log('❌ No profile found by auth_id, trying email fallback...')

      // Fallback to email lookup if provided
      if (email) {
        console.log('🔄 Trying email fallback:', email)
        const emailProfile = await this.getProfileByEmail(email)

        if (emailProfile) {
          const isMember = emailProfile.membership_status || false
          console.log('✅ Profile found by email - Membership result:', isMember)
          console.log('🔍 Email profile details:', {
            profileId: emailProfile.id,
            profileAuthId: emailProfile.auth_id,
            profileEmail: emailProfile.email,
            membershipStatus: emailProfile.membership_status,
            authIdMatches: emailProfile.auth_id === authId,
          })
          return isMember
        }
      }

      console.log('❌ No profile found by auth_id or email - returning false')
      return false
    } catch (error) {
      console.error('Error checking membership status:', error)
      return false
    }
  }

  // ===== PAYMENT SUCCESS HANDLING METHODS =====

  /**
   * Update user membership status by email (for webhook processing)
   * Uses service role to bypass RLS
   */
  static async updateUserMembershipStatus(email: string, status: boolean): Promise<boolean> {
    try {
      console.log(`🔄 Updating membership status for ${email} to ${status}`)

      const { error } = await supabaseServiceRole
        .from('user_profiles')
        .update({
          membership_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)

      if (error) {
        console.error('Error updating membership status:', error)
        return false
      }

      console.log(`✅ Successfully updated membership status for ${email}`)
      return true
    } catch (error) {
      console.error('Error in updateUserMembershipStatus:', error)
      return false
    }
  }

  /**
   * Update user feature access by email (for webhook processing)
   * Uses service role to bypass RLS
   */
  static async updateUserFeatureAccess(email: string, access: boolean): Promise<boolean> {
    try {
      console.log(`🔄 Updating feature access for ${email} to ${access}`)

      const { error } = await supabaseServiceRole
        .from('user_profiles')
        .update({
          feature_access: access,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)

      if (error) {
        console.error('Error updating feature access:', error)
        return false
      }

      console.log(`✅ Successfully updated feature access for ${email}`)
      return true
    } catch (error) {
      console.error('Error in updateUserFeatureAccess:', error)
      return false
    }
  }

  /**
   * Update user Stripe data by email (for webhook processing)
   * Uses service role to bypass RLS
   */
  static async updateUserStripeData(email: string, stripeId: string): Promise<boolean> {
    try {
      console.log(`🔄 Updating Stripe data for ${email} with ID ${stripeId}`)

      const { error } = await supabaseServiceRole
        .from('user_profiles')
        .update({
          stripe_id: stripeId,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)

      if (error) {
        console.error('Error updating Stripe data:', error)
        return false
      }

      console.log(`✅ Successfully updated Stripe data for ${email}`)
      return true
    } catch (error) {
      console.error('Error in updateUserStripeData:', error)
      return false
    }
  }

  /**
   * Process successful payment - update all user data
   */
  static async processSuccessfulPayment(email: string, stripeCustomerId: string): Promise<boolean> {
    try {
      console.log(`🎉 Processing successful payment for ${email}`)

      // Update all payment-related fields
      const membershipUpdated = await this.updateUserMembershipStatus(email, true)
      const featureAccessUpdated = await this.updateUserFeatureAccess(email, true)
      const stripeDataUpdated = await this.updateUserStripeData(email, stripeCustomerId)

      const allSuccessful = membershipUpdated && featureAccessUpdated && stripeDataUpdated

      if (allSuccessful) {
        console.log(`✅ Successfully processed payment for ${email}`)
      } else {
        console.error(`❌ Failed to process payment for ${email} - some updates failed`)
      }

      return allSuccessful
    } catch (error) {
      console.error('Error in processSuccessfulPayment:', error)
      return false
    }
  }
}
