/*
/// Module: htlc_escrow
module htlc_escrow::htlc_escrow;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module htlc_escrow::escrow {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::object;
    use sui::tx_context;
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::hash;
    use sui::transfer;

    // Fusion+ specific parameters
    public struct AuctionParams has copy, drop, store {
        min_amount: u64,
        max_amount: u64,
        start_time: u64,
        end_time: u64,
        resolver_fee: u64,
    }

    // Enhanced Escrow with Fusion+ features
    public struct Escrow<phantom T> has key, store {
        id: object::UID,
        initiator: address,
        redeemer: address,
        secret_hash: vector<u8>,
        amount: u64,
        balance: Balance<T>,
        timelock: u64,  // Timestamp for refund
        auction_params: AuctionParams,
        partial_fills_allowed: bool,
        total_filled: u64,
    }

    // Events for Fusion+ tracking
    public struct Initiated has copy, drop { 
        order_id: vector<u8>, 
        secret_hash: vector<u8>, 
        amount: u64,
        initiator: address,
        redeemer: address,
        timelock: u64
    }
    public struct Redeemed has copy, drop { 
        order_id: vector<u8>, 
        secret: vector<u8>,
        amount: u64,
        redeemer: address
    }
    public struct Refunded has copy, drop { 
        order_id: vector<u8>,
        amount: u64,
        initiator: address
    }
    public struct PartialFill has copy, drop {
        order_id: vector<u8>,
        filled_amount: u64,
        remaining_amount: u64,
        redeemer: address
    }

    // Deposit function (lock funds) - Enhanced for Fusion+
    public fun deposit<T>(
        initiator: address,
        redeemer: address,
        secret_hash: vector<u8>,
        coin: Coin<T>,
        timelock: u64,
        auction_params: AuctionParams,
        partial_fills_allowed: bool,
        _clock: &Clock,
        ctx: &mut tx_context::TxContext
    ): Escrow<T> {
        let balance = coin::into_balance(coin);
        let escrow = Escrow {
            id: object::new(ctx),
            initiator,
            redeemer,
            secret_hash,
            amount: balance::value(&balance),
            balance,
            timelock,
            auction_params,
            partial_fills_allowed,
            total_filled: 0,
        };
        event::emit(Initiated { 
            order_id: object::uid_to_bytes(&escrow.id), 
            secret_hash, 
            amount: escrow.amount,
            initiator,
            redeemer,
            timelock
        });
        escrow
    }

    // Withdraw (claim with secret) - Enhanced for partial fills
    public fun withdraw<T>(
        escrow: &mut Escrow<T>,
        secret: vector<u8>,
        amount: u64,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(hash::blake2b256(&secret) == escrow.secret_hash, 1000);  // Hash check
        assert!(tx_context::sender(ctx) == escrow.redeemer, 1001);  // Redeemer only
        assert!(amount <= escrow.amount, 1004);  // Amount check
        assert!(amount > 0, 1005);  // Non-zero amount
        
        let split_balance = balance::split(&mut escrow.balance, amount);
        let coin = coin::from_balance(split_balance, ctx);
        
        escrow.total_filled = escrow.total_filled + amount;
        
        if (escrow.total_filled == escrow.amount) {
            // Full fill
            event::emit(Redeemed { 
                order_id: object::uid_to_bytes(&escrow.id), 
                secret,
                amount,
                redeemer: tx_context::sender(ctx)
            });
        } else {
            // Partial fill
            event::emit(PartialFill {
                order_id: object::uid_to_bytes(&escrow.id),
                filled_amount: amount,
                remaining_amount: escrow.amount - escrow.total_filled,
                redeemer: tx_context::sender(ctx)
            });
        };
        
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    // Refund (after timelock) - Enhanced for partial amounts
    public fun refund<T>(
        escrow: &mut Escrow<T>,
        clock: &Clock,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(clock::timestamp_ms(clock) > escrow.timelock, 1002);  // Time check
        assert!(tx_context::sender(ctx) == escrow.initiator, 1003);  // Initiator only
        
        let remaining_amount = balance::value(&escrow.balance);
        
        if (remaining_amount > 0) {
            // Take the entire remaining balance
            let remaining_balance = balance::split(&mut escrow.balance, remaining_amount);
            let coin = coin::from_balance(remaining_balance, ctx);
            event::emit(Refunded { 
                order_id: object::uid_to_bytes(&escrow.id),
                amount: remaining_amount,
                initiator: tx_context::sender(ctx)
            });
            transfer::public_transfer(coin, tx_context::sender(ctx));
        };
    }

    // Get remaining amount in escrow
    public fun get_remaining_amount<T>(escrow: &Escrow<T>): u64 {
        balance::value(&escrow.balance)
    }

    // Check if escrow is fully filled
    public fun is_fully_filled<T>(escrow: &Escrow<T>): bool {
        escrow.total_filled == escrow.amount
    }

    // Get auction parameters
    public fun get_auction_params<T>(escrow: &Escrow<T>): AuctionParams {
        escrow.auction_params
    }

    // Create auction parameters (for testing and external use)
    public fun create_auction_params(
        min_amount: u64,
        max_amount: u64,
        start_time: u64,
        end_time: u64,
        resolver_fee: u64
    ): AuctionParams {
        AuctionParams {
            min_amount,
            max_amount,
            start_time,
            end_time,
            resolver_fee,
        }
    }
}
