# Data migration kept apart from schema changes: PostgreSQL refuses deferred index/ALTER
# statements in a transaction that already has pending trigger events.
from django.db import migrations


def subcategories_to_tags(apps, schema_editor):
    """Each subcategory becomes a tag of its parent; its transactions and rules move to the parent."""
    Category = apps.get_model("budget", "Category")
    Tag = apps.get_model("budget", "Tag")
    Transaction = apps.get_model("budget", "Transaction")
    RecurringTransaction = apps.get_model("budget", "RecurringTransaction")

    for sub in Category.objects.filter(parent__isnull=False):
        tag, _ = Tag.objects.get_or_create(category_id=sub.parent_id, name=sub.name[:50])
        Transaction.objects.filter(category=sub).update(category_id=sub.parent_id, tag=tag)
        RecurringTransaction.objects.filter(category=sub).update(category_id=sub.parent_id, tag=tag)
        sub.delete()


class Migration(migrations.Migration):
    dependencies = [("budget", "0005_tags")]

    operations = [migrations.RunPython(subcategories_to_tags, migrations.RunPython.noop)]
