from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Kind(models.TextChoices):
    INCOME = "income", "Income"
    EXPENSE = "expense", "Expense"


class Category(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=100)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    note = models.TextField(blank=True, default="")
    color = models.CharField(max_length=7, default="#6366f1")
    icon = models.CharField(max_length=40, default="tag")
    monthly_limit = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0.01)]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return f"{self.name} ({self.kind})"


class RecurringTransaction(models.Model):
    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recurring")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="recurring")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    description = models.CharField(max_length=255, blank=True, default="")
    frequency = models.CharField(max_length=10, choices=Frequency.choices, default=Frequency.MONTHLY)
    interval = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    occurrences = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_date", "id"]

    def occurrence_date(self, n):
        """Date of the n-th occurrence (0-based), computed from start_date to avoid day drift."""
        step = n * self.interval
        delta = {
            self.Frequency.DAILY: relativedelta(days=step),
            self.Frequency.WEEKLY: relativedelta(weeks=step),
            self.Frequency.MONTHLY: relativedelta(months=step),
            self.Frequency.YEARLY: relativedelta(years=step),
        }[self.frequency]
        return self.start_date + delta

    @property
    def next_date(self):
        nxt = self.occurrence_date(self.occurrences)
        if self.end_date and nxt > self.end_date:
            return None
        return nxt

    def __str__(self):
        return f"{self.description or self.category.name} every {self.interval} {self.frequency}"


class Transaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="transactions")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    date = models.DateField()
    description = models.CharField(max_length=255, blank=True, default="")
    recurring = models.ForeignKey(
        RecurringTransaction, null=True, blank=True, on_delete=models.SET_NULL, related_name="transactions"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    @property
    def kind(self):
        return self.category.kind

    def __str__(self):
        return f"{self.date} {self.amount} {self.category.name}"
