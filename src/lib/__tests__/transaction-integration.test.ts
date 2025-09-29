import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceService } from '../invoice-service';
import { TransactionService } from '../transaction-service';
import { AccountBalanceService } from '../account-balance-service';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
};

vi.mock('@/lib/SupabaseServerClient', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}));

vi.mock('@/lib/tax-rates', () => ({
  getOrganizationTaxRate: vi.fn(() => Promise.resolve(0.15))
}));

describe('Transaction Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invoice to Transaction Flow', () => {
    it('should create debit transaction when invoice status changes to pending', async () => {
      const invoice = {
        id: 'invoice-123',
        invoice_number: 'INV-2025-01-0001',
        total_amount: 100,
        user_id: 'user-123',
        status: 'draft'
      };

      // Mock invoice fetch
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: invoice,
            error: null
          })
        })
      });

      // Mock invoice update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      // Mock transaction creation (no existing transaction)
      const mockTransactionSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      });

      // Mock transaction insert
      const mockTransactionInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'transaction-123' },
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'invoices') {
          return {
            select: mockSelect,
            update: mockUpdate
          };
        }
        if (table === 'transactions') {
          return {
            select: mockTransactionSelect,
            insert: mockTransactionInsert
          };
        }
      });

      // Test the flow
      await InvoiceService.updateInvoiceStatus('invoice-123', 'pending');

      // Verify invoice was updated
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'pending',
        updated_at: expect.any(String)
      });

      // Verify transaction was created
      expect(mockTransactionInsert).toHaveBeenCalledWith([{
        user_id: 'user-123',
        type: 'debit',
        amount: 100,
        description: 'Invoice: INV-2025-01-0001',
        metadata: {
          invoice_id: 'invoice-123',
          invoice_number: 'INV-2025-01-0001',
          transaction_type: 'invoice_debit'
        },
        reference_number: 'INV-2025-01-0001',
        status: 'completed',
        completed_at: expect.any(String)
      }]);
    });

    it('should reverse transaction when invoice is cancelled', async () => {
      const invoice = {
        id: 'invoice-123',
        invoice_number: 'INV-2025-01-0001',
        total_amount: 100,
        user_id: 'user-123',
        status: 'pending'
      };

      // Mock invoice fetch
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: invoice,
            error: null
          })
        })
      });

      // Mock invoice update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      // Mock finding existing debit transaction
      const mockFindTransaction = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'debit-transaction-123' },
                error: null
              })
            })
          })
        })
      });

      // Mock fetching original transaction for reversal
      const mockFetchOriginal = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'debit-transaction-123',
              user_id: 'user-123',
              type: 'debit',
              amount: 100,
              description: 'Invoice: INV-2025-01-0001',
              metadata: { invoice_id: 'invoice-123' },
              reference_number: 'INV-2025-01-0001'
            },
            error: null
          })
        })
      });

      // Mock checking for existing reversal
      const mockCheckReversal = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      // Mock reversal transaction insert
      const mockReversalInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'reversal-transaction-123' },
            error: null
          })
        })
      });

      let selectCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'invoices') {
          return {
            select: mockSelect,
            update: mockUpdate
          };
        }
        if (table === 'transactions') {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First call: find debit transaction
            return { select: mockFindTransaction };
          } else if (selectCallCount === 2) {
            // Second call: fetch original transaction
            return { select: mockFetchOriginal };
          } else {
            // Third call: check for existing reversal
            return { select: mockCheckReversal, insert: mockReversalInsert };
          }
        }
      });

      // Test the cancellation flow
      await InvoiceService.updateInvoiceStatus('invoice-123', 'cancelled');

      // Verify reversal transaction was created
      expect(mockReversalInsert).toHaveBeenCalledWith([{
        user_id: 'user-123',
        type: 'credit', // Opposite of debit
        amount: 100,
        description: 'Reversal: Invoice: INV-2025-01-0001 (Invoice cancelled)',
        metadata: {
          invoice_id: 'invoice-123',
          reversal_of: 'debit-transaction-123',
          reversal_reason: 'Invoice cancelled',
          transaction_type: 'reversal'
        },
        reference_number: 'REV-INV-2025-01-0001',
        status: 'completed',
        completed_at: expect.any(String)
      }]);
    });
  });

  describe('Payment to Transaction Flow', () => {
    it('should create credit transaction when payment is recorded', async () => {
      // This would be tested in the payment API integration tests
      // For now, we can test the TransactionService.createPaymentCredit method
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'credit-transaction-123' },
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      });

      const paymentData = {
        user_id: 'user-123',
        amount: 50,
        invoice_id: 'invoice-123',
        invoice_number: 'INV-2025-01-0001',
        payment_id: 'payment-123'
      };

      const result = await TransactionService.createPaymentCredit(paymentData);

      expect(result).toBe('credit-transaction-123');
      expect(mockInsert).toHaveBeenCalledWith([{
        user_id: 'user-123',
        type: 'credit',
        amount: 50,
        description: 'Payment for invoice: INV-2025-01-0001',
        metadata: {
          invoice_id: 'invoice-123',
          payment_id: 'payment-123',
          invoice_number: 'INV-2025-01-0001',
          transaction_type: 'payment_credit'
        },
        status: 'completed',
        completed_at: expect.any(String)
      }]);
    });
  });

  describe('Account Balance Integration', () => {
    it('should calculate balance correctly after transactions', async () => {
      // Mock the RPC call for balance calculation
      mockSupabaseClient.rpc.mockResolvedValue({
        data: -50, // User owes $50 (debit $100, credit $50)
        error: null
      });

      const balance = await AccountBalanceService.getBalance('user-123');

      expect(balance).toBe(-50);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_account_balance', {
        p_user_id: 'user-123'
      });
    });

    it('should get balance history with running totals', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          type: 'debit',
          amount: 100,
          description: 'Invoice: INV-001',
          created_at: '2025-01-01T10:00:00Z',
          status: 'completed',
          metadata: { invoice_id: 'inv-1' }
        },
        {
          id: 'trans-2',
          type: 'credit',
          amount: 50,
          description: 'Payment for invoice: INV-001',
          created_at: '2025-01-01T11:00:00Z',
          status: 'completed',
          metadata: { payment_id: 'pay-1' }
        }
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTransactions,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      // Mock current balance
      mockSupabaseClient.rpc.mockResolvedValue({
        data: -50,
        error: null
      });

      const history = await AccountBalanceService.getBalanceHistory('user-123', 30);

      expect(history).toHaveLength(2);
      expect(history[0].running_balance).toBe(-50); // Current balance
      expect(history[1].running_balance).toBe(-100); // Balance before the credit
    });
  });
});
