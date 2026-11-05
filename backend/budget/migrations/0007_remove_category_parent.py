from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("budget", "0006_subcategories_to_tags")]

    operations = [
        migrations.RemoveField(model_name="category", name="parent"),
    ]
