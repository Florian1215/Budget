from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Category, RecurringTransaction, Transaction

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate(self, attrs):
        validate_password(attrs["password"], User(username=attrs.get("username"), email=attrs.get("email")))
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class OwnedCategoryField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        return Category.objects.filter(user=self.context["request"].user)


class CategorySerializer(serializers.ModelSerializer):
    parent = OwnedCategoryField(allow_null=True, required=False)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "kind", "parent", "note", "color", "icon", "monthly_limit", "total", "created_at"]
        read_only_fields = ["created_at"]
        extra_kwargs = {"kind": {"required": False}}

    def get_total(self, obj):
        totals = self.context.get("totals")
        if totals is None:
            return None
        return str(totals.get(obj.id, 0))

    def validate(self, attrs):
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        if self.instance is not None:
            # The kind of an existing category cannot change (keeps subcategories consistent).
            attrs.pop("kind", None)
            if parent is not None and (parent.pk == self.instance.pk or self.instance.children.exists()):
                raise serializers.ValidationError({"parent": "This category cannot become a subcategory."})
        if parent is not None:
            if parent.parent_id is not None:
                raise serializers.ValidationError({"parent": "Subcategories cannot have subcategories."})
            attrs["kind"] = parent.kind
        elif self.instance is None and not attrs.get("kind"):
            raise serializers.ValidationError({"kind": "This field is required."})
        return attrs


class TransactionSerializer(serializers.ModelSerializer):
    category = OwnedCategoryField()
    kind = serializers.CharField(source="category.kind", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id", "category", "category_name", "category_color", "category_icon", "kind",
            "amount", "date", "description", "recurring", "created_at",
        ]
        read_only_fields = ["recurring", "created_at"]


class RecurringTransactionSerializer(serializers.ModelSerializer):
    category = OwnedCategoryField()
    kind = serializers.CharField(source="category.kind", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)
    next_date = serializers.DateField(read_only=True)

    class Meta:
        model = RecurringTransaction
        fields = [
            "id", "category", "category_name", "category_color", "category_icon", "kind", "amount", "description",
            "frequency", "interval", "start_date", "end_date", "active",
            "occurrences", "next_date", "created_at",
        ]
        read_only_fields = ["occurrences", "created_at"]

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date must be after the start date."})
        if self.instance is not None and self.instance.occurrences > 0:
            # Changing the schedule after occurrences were generated would shift past dates.
            for field in ("start_date", "frequency", "interval"):
                if field in attrs and attrs[field] != getattr(self.instance, field):
                    raise serializers.ValidationError(
                        {field: "Cannot change the schedule once transactions have been generated."}
                    )
        return attrs
