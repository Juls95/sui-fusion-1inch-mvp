#[test_only]
module htlc_escrow::htlc_escrow_tests {
    use htlc_escrow::escrow::{Self, Escrow};
    use sui::test_scenario::{Self};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use sui::clock::{Self};
    use sui::test_utils::{assert_eq};
    use sui::hash;

    // Real test addresses - replace with your actual addresses
    const ALICE: address = @0xbf1d94e164909345c3783e4cda3bfb61e950910aea8228329533e063a6871e9c;
    const BOB: address = @0x431E067a987519C26184951eD6fD6acDE763d3B6;

    #[test]
    fun test_deposit_success() {
        let mut scenario = test_scenario::begin(ALICE);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create test coin and clock
        let coin = coin::mint_for_testing<SUI>(1000, ctx);
        let clock = clock::create_for_testing(ctx);
        
        // Create auction params
        let auction_params = escrow::create_auction_params(
            100,  // min_amount
            1000, // max_amount
            1000, // start_time
            2000, // end_time
            10    // resolver_fee
        );
        
        // Secret and hash
        let secret = b"test_secret_123";
        let secret_hash = hash::blake2b256(&secret);
        
        // Alice deposits
        let escrow = escrow::deposit<SUI>(
            ALICE,
            BOB,
            secret_hash,
            coin,
            5000, // timelock in the future
            auction_params,
            true, // partial fills allowed
            &clock,
            ctx
        );
        
        // Check initial state
        assert_eq(escrow::is_fully_filled(&escrow), false);
        assert_eq(escrow::get_remaining_amount(&escrow), 1000);
        
        // Clean up
        transfer::public_transfer(escrow, ALICE);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_full_withdrawal() {
        let mut scenario = test_scenario::begin(BOB);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create test coin and clock
        let coin = coin::mint_for_testing<SUI>(1000, ctx);
        let clock = clock::create_for_testing(ctx);
        
        // Create auction params
        let auction_params = escrow::create_auction_params(
            100, 1000, 1000, 2000, 10
        );
        
        // Secret and hash
        let secret = b"test_secret_123";
        let secret_hash = hash::blake2b256(&secret);
        
        // Create escrow (as if Alice deposited)
        let mut escrow = escrow::deposit<SUI>(
            ALICE,
            BOB,
            secret_hash,
            coin,
            5000,
            auction_params,
            true,
            &clock,
            ctx
        );
        
        // Bob withdraws full amount
        escrow::withdraw(&mut escrow, secret, 1000, ctx);
        
        // Check if fully filled
        assert_eq(escrow::is_fully_filled(&escrow), true);
        assert_eq(escrow::get_remaining_amount(&escrow), 0);
        
        // Clean up
        transfer::public_transfer(escrow, BOB);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_partial_withdrawal() {
        let mut scenario = test_scenario::begin(BOB);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create test coin and clock
        let coin = coin::mint_for_testing<SUI>(1000, ctx);
        let clock = clock::create_for_testing(ctx);
        
        // Create auction params
        let auction_params = escrow::create_auction_params(
            100, 1000, 1000, 2000, 10
        );
        
        // Secret and hash
        let secret = b"test_secret_123";
        let secret_hash = hash::blake2b256(&secret);
        
        // Create escrow
        let mut escrow = escrow::deposit<SUI>(
            ALICE,
            BOB,
            secret_hash,
            coin,
            5000,
            auction_params,
            true,
            &clock,
            ctx
        );
        
        // Partial withdrawal (400 out of 1000)
        escrow::withdraw(&mut escrow, secret, 400, ctx);
        
        // Check remaining amount
        assert_eq(escrow::is_fully_filled(&escrow), false);
        assert_eq(escrow::get_remaining_amount(&escrow), 600);
        
        // Clean up
        transfer::public_transfer(escrow, BOB);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_refund_after_timelock() {
        let mut scenario = test_scenario::begin(ALICE);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create test coin and clock
        let coin = coin::mint_for_testing<SUI>(1000, ctx);
        let mut clock = clock::create_for_testing(ctx);
        
        // Create auction params
        let auction_params = escrow::create_auction_params(
            100, 1000, 1000, 2000, 10
        );
        
        // Secret and hash
        let secret = b"test_secret_123";
        let secret_hash = hash::blake2b256(&secret);
        
        // Create escrow with short timelock
        let mut escrow = escrow::deposit<SUI>(
            ALICE,
            BOB,
            secret_hash,
            coin,
            1500, // timelock
            auction_params,
            true,
            &clock,
            ctx
        );
        
        // Advance time past timelock
        clock::increment_for_testing(&mut clock, 2000);
        
        // Alice refunds
        escrow::refund(&mut escrow, &clock, ctx);
        
        // Check remaining amount after refund
        assert_eq(escrow::get_remaining_amount(&escrow), 0);
        
        // Clean up
        transfer::public_transfer(escrow, ALICE);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test, expected_failure(abort_code = 1000)]
    fun test_wrong_secret_fails() {
        let mut scenario = test_scenario::begin(BOB);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let coin = coin::mint_for_testing<SUI>(1000, ctx);
        let clock = clock::create_for_testing(ctx);
        
        let auction_params = escrow::create_auction_params(
            100, 1000, 1000, 2000, 10
        );
        
        let secret = b"correct_secret";
        let secret_hash = hash::blake2b256(&secret);
        
        let mut escrow = escrow::deposit<SUI>(
            ALICE,
            BOB,
            secret_hash,
            coin,
            5000,
            auction_params,
            true,
            &clock,
            ctx
        );
        
        // Bob tries with wrong secret
        let wrong_secret = b"wrong_secret";
        escrow::withdraw(&mut escrow, wrong_secret, 1000, ctx); // Should fail
        
        // Clean up (won't reach here due to expected failure)
        transfer::public_transfer(escrow, BOB);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test, expected_failure(abort_code = 1002)]
    fun test_early_refund_fails() {
        let mut scenario = test_scenario::begin(ALICE);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let coin = coin::mint_for_testing<SUI>(1000, ctx);
        let clock = clock::create_for_testing(ctx);
        
        let auction_params = escrow::create_auction_params(
            100, 1000, 1000, 2000, 10
        );
        
        let secret = b"test_secret";
        let secret_hash = hash::blake2b256(&secret);
        
        let mut escrow = escrow::deposit<SUI>(
            ALICE,
            BOB,
            secret_hash,
            coin,
            5000, // timelock in future
            auction_params,
            true,
            &clock,
            ctx
        );
        
        // Alice tries to refund before timelock
        escrow::refund(&mut escrow, &clock, ctx); // Should fail
        
        // Clean up (won't reach here due to expected failure)
        transfer::public_transfer(escrow, ALICE);
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}
