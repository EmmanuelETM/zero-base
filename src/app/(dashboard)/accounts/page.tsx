import {
  getAccountsByUser,
  getAccountBalance,
} from "@/server/actions/accounts";
import { AccountList } from "@/components/features/accounts/account-list";

export const metadata = {
  title: "Cuentas | Zero Base",
};

export default async function AccountsPage() {
  const accounts = await getAccountsByUser();

  // Fetch balances for all accounts
  const accountsWithBalances = await Promise.all(
    accounts.map(async (acc) => {
      const balance = await getAccountBalance(acc.id);
      return {
        ...acc,
        balance: balance.toString(),
      };
    }),
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500">
      <AccountList accounts={accountsWithBalances} />
    </div>
  );
}
