from django.contrib import admin

from .models import Category, RecurringTransaction, Transaction


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "parent", "user")
    list_filter = ("kind",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("date", "amount", "category", "description", "user")
    list_filter = ("category__kind",)


@admin.register(RecurringTransaction)
class RecurringTransactionAdmin(admin.ModelAdmin):
    list_display = ("description", "amount", "frequency", "interval", "start_date", "end_date", "active", "user")
