from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("budget", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="category",
            name="icon",
            field=models.CharField(default="tag", max_length=40),
        ),
    ]
