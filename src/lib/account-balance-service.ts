import { createClient } from '@/lib/SupabaseServerClient';
import { TransactionService } from './transaction-service';

export interface BalanceHistoryItem {
  id: string;
  type: 'debit' | 'credit' | 'refund' | 'adjustment';
  amount: number;
  description: string;
  created_at: string;
  status: string;
  metadata?: Record<string, unknown>;
  running_balance?: number;
}

export class AccountBalanceService {
  /**
   * Get user's current account balance
   * Uses the existing database function that's maintained by triggers
   */
  static async getBalance(userId: string): Promise<number> {
    try {
      return await TransactionService.getUserAccountBalance(userId);
    } catch (error) {
      console.error(`Failed to get balance for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Refresh user's account balance by touching a transaction
   * This triggers the balance update mechanism
   */
  static async refreshBalance(userId: string): Promise<number> {
    const supabase = await createClient();
    
    try {
      // Get the most recent transaction for this user
      const { data: lastTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (lastTransaction) {
        // Touch the transaction to trigger balance update
        await supabase
          .from('transactions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', lastTransaction.id);
        
        console.log(`Refreshed balance for user ${userId} by touching transaction ${lastTransaction.id}`);
      }
      
      return await this.getBalance(userId);
    } catch (error) {
      console.error(`Failed to refresh balance for user ${userId}:`, error);
      // Return current balance even if refresh failed
      return await this.getBalance(userId);
    }
  }
  
  /**
   * Get account balance history with running totals
   */
  static async getBalanceHistory(userId: string, days = 30): Promise<BalanceHistoryItem[]> {
    const supabase = await createClient();
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          description,
          created_at,
          status,
          metadata
        `)
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to fetch balance history: ${error.message}`);
      }
      
      // Calculate running balances
      const transactions = data || [];
      let runningBalance = await this.getBalance(userId);
      
      // Start from most recent and work backwards
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i] as BalanceHistoryItem;
        transaction.running_balance = runningBalance;
        
        // Calculate what the balance was before this transaction
        if (transaction.type === 'debit') {
          runningBalance += transaction.amount; // Remove the debit to get previous balance
        } else if (transaction.type === 'credit') {
          runningBalance -= transaction.amount; // Remove the credit to get previous balance
        }
      }
      
      return transactions;
    } catch (error) {
      console.error(`Failed to fetch balance history for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get balance summary for a user
   */
  static async getBalanceSummary(userId: string): Promise<{
    current_balance: number;
    total_debits: number;
    total_credits: number;
    pending_amount: number;
    last_transaction_date: string | null;
  }> {
    const supabase = await createClient();
    
    try {
      // Get current balance
      const currentBalance = await this.getBalance(userId);
      
      // Get transaction summaries
      const { data: summaryData, error } = await supabase
        .from('transactions')
        .select('type, amount, status, created_at')
        .eq('user_id', userId);
      
      if (error) {
        throw new Error(`Failed to fetch balance summary: ${error.message}`);
      }
      
      const transactions = summaryData || [];
      
      let totalDebits = 0;
      let totalCredits = 0;
      let pendingAmount = 0;
      let lastTransactionDate: string | null = null;
      
      transactions.forEach(transaction => {
        if (transaction.status === 'completed') {
          if (transaction.type === 'debit') {
            totalDebits += parseFloat(transaction.amount.toString());
          } else if (transaction.type === 'credit') {
            totalCredits += parseFloat(transaction.amount.toString());
          }
        } else if (transaction.status === 'pending') {
          pendingAmount += parseFloat(transaction.amount.toString());
        }
        
        // Track most recent transaction date
        if (!lastTransactionDate || transaction.created_at > lastTransactionDate) {
          lastTransactionDate = transaction.created_at;
        }
      });
      
      return {
        current_balance: currentBalance,
        total_debits: totalDebits,
        total_credits: totalCredits,
        pending_amount: pendingAmount,
        last_transaction_date: lastTransactionDate
      };
    } catch (error) {
      console.error(`Failed to get balance summary for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all users with outstanding balances (for admin use)
   */
  static async getUsersWithOutstandingBalances(limit = 50): Promise<Array<{
    user_id: string;
    balance: number;
    last_transaction_date: string | null;
  }>> {
    const supabase = await createClient();
    
    try {
      // Get all users who have transactions
      const { data: usersWithTransactions, error } = await supabase
        .from('transactions')
        .select('user_id')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to fetch users with transactions: ${error.message}`);
      }
      
      // Get unique user IDs
      const uniqueUserIds = [...new Set(usersWithTransactions?.map(t => t.user_id) || [])];
      
      // Get balances for each user
      const usersWithBalances = [];
      
      for (const userId of uniqueUserIds.slice(0, limit)) {
        try {
          const balance = await this.getBalance(userId);
          
          if (balance !== 0) { // Only include users with non-zero balances
            // Get last transaction date
            const { data: lastTransaction } = await supabase
              .from('transactions')
              .select('created_at')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            usersWithBalances.push({
              user_id: userId,
              balance: balance,
              last_transaction_date: lastTransaction?.created_at || null
            });
          }
        } catch (error) {
          console.error(`Failed to get balance for user ${userId}:`, error);
          // Continue with other users
        }
      }
      
      // Sort by balance (highest debt first)
      return usersWithBalances.sort((a, b) => a.balance - b.balance);
    } catch (error) {
      console.error('Failed to get users with outstanding balances:', error);
      throw error;
    }
  }
}
