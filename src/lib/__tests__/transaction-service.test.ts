import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService } from '../transaction-service';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn()
};

vi.mock('@/lib/SupabaseServerClient', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}));

describe('TransactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInvoiceDebit', () => {
    it('should create debit transaction for invoice', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'transaction-123' },
            error: null
          })
        })
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null, // No existing transaction
                error: null
              })
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert
      });

      const invoiceData = {
        invoice_id: 'invoice-123',
        invoice_number: 'INV-2025-01-0001',
        total_amount: 100.50,
        user_id: 'user-123'
      };

      const result = await TransactionService.createInvoiceDebit(invoiceData);

      expect(result).toBe('transaction-123');
      expect(mockInsert).toHaveBeenCalledWith([{
        user_id: 'user-123',
        type: 'debit',
        amount: 100.50,
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

    it('should return existing transaction ID if already exists', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'existing-transaction-123' },
                error: null
              })
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const invoiceData = {
        invoice_id: 'invoice-123',
        invoice_number: 'INV-2025-01-0001',
        total_amount: 100.50,
        user_id: 'user-123'
      };

      const result = await TransactionService.createInvoiceDebit(invoiceData);

      expect(result).toBe('existing-transaction-123');
    });
  });

  describe('createPaymentCredit', () => {
    it('should create credit transaction for payment', async () => {
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
        amount: 50.25,
        invoice_id: 'invoice-123',
        invoice_number: 'INV-2025-01-0001',
        payment_id: 'payment-123'
      };

      const result = await TransactionService.createPaymentCredit(paymentData);

      expect(result).toBe('credit-transaction-123');
      expect(mockInsert).toHaveBeenCalledWith([{
        user_id: 'user-123',
        type: 'credit',
        amount: 50.25,
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

  describe('reverseTransaction', () => {
    it('should create reversal transaction', async () => {
      const originalTransaction = {
        id: 'original-123',
        user_id: 'user-123',
        type: 'debit',
        amount: 100,
        description: 'Invoice: INV-2025-01-0001',
        metadata: { invoice_id: 'invoice-123' },
        reference_number: 'INV-2025-01-0001'
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: originalTransaction,
            error: null
          })
        })
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'reversal-123' },
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'transactions') {
          return {
            select: mockSelect,
            insert: mockInsert
          };
        }
      });

      const result = await TransactionService.reverseTransaction('original-123', 'Invoice cancelled');

      expect(result).toBe('reversal-123');
      expect(mockInsert).toHaveBeenCalledWith([{
        user_id: 'user-123',
        type: 'credit', // Opposite of original debit
        amount: 100,
        description: 'Reversal: Invoice: INV-2025-01-0001 (Invoice cancelled)',
        metadata: {
          invoice_id: 'invoice-123',
          reversal_of: 'original-123',
          reversal_reason: 'Invoice cancelled',
          transaction_type: 'reversal'
        },
        reference_number: 'REV-INV-2025-01-0001',
        status: 'completed',
        completed_at: expect.any(String)
      }]);
    });
  });

  describe('getUserAccountBalance', () => {
    it('should get user account balance using RPC', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: 150.75,
        error: null
      });

      const result = await TransactionService.getUserAccountBalance('user-123');

      expect(result).toBe(150.75);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_account_balance', {
        p_user_id: 'user-123'
      });
    });

    it('should return 0 if balance is null', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await TransactionService.getUserAccountBalance('user-123');

      expect(result).toBe(0);
    });

    it('should throw error if RPC fails', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' }
      });

      await expect(TransactionService.getUserAccountBalance('user-123'))
        .rejects.toThrow('Failed to get account balance: RPC failed');
    });
  });

  describe('findInvoiceDebitTransaction', () => {
    it('should find debit transaction for invoice', async () => {
      const mockSelect = vi.fn().mockReturnValue({
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

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await TransactionService.findInvoiceDebitTransaction('invoice-123');

      expect(result).toBe('debit-transaction-123');
    });

    it('should return null if no debit transaction found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' } // Not found
              })
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await TransactionService.findInvoiceDebitTransaction('invoice-123');

      expect(result).toBeNull();
    });
  });
});
