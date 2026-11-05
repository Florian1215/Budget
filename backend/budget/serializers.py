from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Category, RecurringTransaction, Tag, Transaction

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


class OwnedTagField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        return Tag.objects.filter(category__user=self.context["request"].user)


class TagSerializer(serializers.ModelSerializer):
    category = OwnedCategoryField()

    class Meta:
        model = Tag
        fields = ["id", "category", "name"]
        validators = []  # uniqueness is checked case-insensitively below

    def validate(self, attrs):
        category = attrs.get("category", getattr(self.instance, "category", None))
        name = attrs.get("name", getattr(self.instance, "name", "")).strip()
        if not name:
            raise serializers.ValidationError({"name": "This field may not be blank."})
        clash = Tag.objects.filter(category=category, name__iexact=name)
        if self.instance is not None:
            clash = clash.exclude(pk=self.instance.pk)
            attrs.pop("category", None)  # a tag stays in its category
        if clash.exists():
            raise serializers.ValidationError({"name": "This tag already exists in this category."})
        attrs["name"] = name
        return attrs


class CategoryTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class CategorySerializer(serializers.ModelSerializer):
    tags = CategoryTagSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "kind", "note", "color", "icon", "monthly_limit", "tags", "total", "created_at"]
        read_only_fields = ["created_at"]
        extra_kwargs = {"kind": {"required": False}}

    def get_total(self, obj):
        totals = self.context.get("totals")
        if totals is None:
            return None
        return str(totals.get(obj.id, 0))

    def validate(self, attrs):
        if self.instance is not None:
            attrs.pop("kind", None)  # the kind of an existing category cannot change
        elif not attrs.get("kind"):
            raise serializers.ValidationError({"kind": "This field is required."})
        return attrs


class TagNameMixin:
    def get_tag_name(self, obj):
        return obj.tag.name if obj.tag_id else None


def validate_tag_in_category(serializer, attrs):
    """The tag must belong to the transaction's category; changing the category drops a stale tag."""
    category = attrs.get("category", getattr(serializer.instance, "category", None))
    if "tag" in attrs:
        if attrs["tag"] is not None and attrs["tag"].category_id != category.id:
            raise serializers.ValidationError({"tag": "This tag belongs to another category."})
    elif serializer.instance is not None and serializer.instance.tag_id is not None:
        if serializer.instance.tag.category_id != category.id:
            attrs["tag"] = None


class TransactionSerializer(TagNameMixin, serializers.ModelSerializer):
    category = OwnedCategoryField()
    tag = OwnedTagField(allow_null=True, required=False)
    tag_name = serializers.SerializerMethodField()
    kind = serializers.CharField(source="category.kind", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id", "category", "category_name", "category_color", "category_icon", "kind",
            "tag", "tag_name", "amount", "date", "description", "recurring", "created_at",
        ]
        read_only_fields = ["recurring", "created_at"]

    def validate(self, attrs):
        validate_tag_in_category(self, attrs)
        return attrs


class RecurringTransactionSerializer(TagNameMixin, serializers.ModelSerializer):
    category = OwnedCategoryField()
    tag = OwnedTagField(allow_null=True, required=False)
    tag_name = serializers.SerializerMethodField()
    kind = serializers.CharField(source="category.kind", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)
    next_date = serializers.DateField(read_only=True)

    class Meta:
        model = RecurringTransaction
        fields = [
            "id", "category", "category_name", "category_color", "category_icon", "kind",
            "tag", "tag_name", "amount", "description",
            "frequency", "interval", "start_date", "end_date", "active",
            "occurrences", "next_date", "created_at",
        ]
        read_only_fields = ["occurrences", "created_at"]

    def validate(self, attrs):
        validate_tag_in_category(self, attrs)
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
