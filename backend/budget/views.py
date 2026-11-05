from datetime import date

from django.contrib.auth import authenticate
from django.db.models import Sum
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Category, Kind, RecurringTransaction, Tag, Transaction
from .recurring import generate_due_transactions
from .serializers import (
    CategorySerializer,
    RecurringTransactionSerializer,
    RegisterSerializer,
    TagSerializer,
    TransactionSerializer,
    UserSerializer,
)


def parse_date(value, name):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError({name: "Invalid date, expected YYYY-MM-DD."})


def date_range(request):
    return (
        parse_date(request.query_params.get("start"), "start"),
        parse_date(request.query_params.get("end"), "end"),
    )


def filter_by_dates(qs, start, end):
    if start:
        qs = qs.filter(date__gte=start)
    if end:
        qs = qs.filter(date__lte=end)
    return qs


# ---------- Auth ----------

def token_response(user, status_code=status.HTTP_200_OK):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data}, status=status_code)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return token_response(serializer.save(), status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login(request):
    user = authenticate(
        username=request.data.get("username", ""), password=request.data.get("password", "")
    )
    if user is None:
        return Response({"detail": "Invalid username or password."}, status=status.HTTP_400_BAD_REQUEST)
    return token_response(user)


@api_view(["POST"])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def me(request):
    return Response(UserSerializer(request.user).data)


# ---------- Resources ----------

class GenerateRecurringMixin:
    """Materialize due recurring transactions before reading data."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method == "GET":
            generate_due_transactions(request.user)


class CategoryViewSet(GenerateRecurringMixin, viewsets.ModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        qs = Category.objects.filter(user=self.request.user).prefetch_related("tags")
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action in ("list", "retrieve"):
            start, end = date_range(self.request)
            sums = (
                filter_by_dates(Transaction.objects.filter(user=self.request.user), start, end)
                .values("category_id")
                .annotate(total=Sum("amount"))
            )
            context["totals"] = {row["category_id"]: row["total"] for row in sums}
        return context

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionViewSet(GenerateRecurringMixin, viewsets.ModelViewSet):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user).select_related("category", "tag")
        start, end = date_range(self.request)
        qs = filter_by_dates(qs, start, end)
        params = self.request.query_params
        if params.get("kind"):
            qs = qs.filter(category__kind=params["kind"])
        if params.get("category"):
            qs = qs.filter(category_id=params["category"])
        if params.get("tag"):
            qs = qs.filter(tag_id=params["tag"])
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer

    def get_queryset(self):
        qs = Tag.objects.filter(category__user=self.request.user)
        if self.request.query_params.get("category"):
            qs = qs.filter(category_id=self.request.query_params["category"])
        return qs


class RecurringTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringTransactionSerializer

    def get_queryset(self):
        return RecurringTransaction.objects.filter(user=self.request.user).select_related("category", "tag")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        generate_due_transactions(self.request.user)
        serializer.instance.refresh_from_db()

    def perform_update(self, serializer):
        serializer.save()
        generate_due_transactions(self.request.user)
        serializer.instance.refresh_from_db()


def total_limit(user):
    """The overall monthly limit is the sum of the expense category limits."""
    return Category.objects.filter(user=user, kind=Kind.EXPENSE).aggregate(s=Sum("monthly_limit"))["s"]


@api_view(["GET"])
def summary(request):
    generate_due_transactions(request.user)
    start, end = date_range(request)
    qs = filter_by_dates(Transaction.objects.filter(user=request.user), start, end)
    income = qs.filter(category__kind=Kind.INCOME).aggregate(s=Sum("amount"))["s"] or 0
    expense = qs.filter(category__kind=Kind.EXPENSE).aggregate(s=Sum("amount"))["s"] or 0
    limit = total_limit(request.user)
    return Response(
        {
            "income": str(income),
            "expense": str(expense),
            "balance": str(income - expense),
            "limit": str(limit) if limit is not None else None,
        }
    )

