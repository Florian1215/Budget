from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("categories", views.CategoryViewSet, basename="category")
router.register("transactions", views.TransactionViewSet, basename="transaction")
router.register("tags", views.TagViewSet, basename="tag")
router.register("recurring", views.RecurringTransactionViewSet, basename="recurring")

urlpatterns = [
    path("auth/register/", views.register),
    path("auth/login/", views.login),
    path("auth/logout/", views.logout),
    path("auth/me/", views.me),
    path("summary/", views.summary),
    path("", include(router.urls)),
]
