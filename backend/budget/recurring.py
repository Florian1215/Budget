from django.db import transaction as db_transaction
from django.utils import timezone

from .models import RecurringTransaction, Transaction


def generate_due_transactions(user, until=None):
    """Create the transactions of every recurring rule that are due up to `until` (default: today)."""
    until = until or timezone.localdate()
    with db_transaction.atomic():
        rules = RecurringTransaction.objects.select_for_update().filter(
            user=user, active=True, start_date__lte=until
        )
        for rule in rules:
            created = []
            while True:
                date = rule.next_date
                if date is None or date > until:
                    break
                created.append(
                    Transaction(
                        user=user,
                        category_id=rule.category_id,
                        amount=rule.amount,
                        date=date,
                        description=rule.description,
                        recurring=rule,
                    )
                )
                rule.occurrences += 1
            if created:
                Transaction.objects.bulk_create(created)
                rule.save(update_fields=["occurrences"])
