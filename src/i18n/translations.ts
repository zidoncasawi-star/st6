export const translations = {
  ar: {
    // Sidebar
    nav: {
      overview: 'نظرة عامة',
      recharges: 'إدارة الشحن وتوليد الأكواد',
      subscribers: 'المشتركون وباقات التجربة',
      servers: 'أسطول خوادم VPN',
      vpsMonitor: 'استهلاك موارد VPS',
      profiles: 'إعدادات الاتصال (SNI & Payloads)',
      licenses: 'التراخيص والكوبونات',
      settings: 'إعدادات التطبيق وزر التوقف',
      logout: 'تسجيل الخروج',
      adminPanel: 'لوحة التحكم',
      controlModules: 'وحدات التحكم',
    },
    // Dashboard Overview
    dashboard: {
      title: 'نظرة عامة على النظام',
      liveConnections: 'الاتصالات الحية',
      activeServers: 'الخوادم النشطة',
      activeSubscribers: 'المشتركين النشطين',
      activeLicenses: 'تراخيص VIP النشطة',
      pendingRecharges: 'طلبات شحن معلقة',
      networkTraffic: 'استهلاك الشبكة اليوم',
      quickActions: 'إجراءات سريعة',
      addServer: 'إضافة خادم',
      generateCards: 'توليد بطاقات',
      appSettings: 'إعدادات التطبيق',
      serversOverview: 'حالة الخوادم الحية',
      capacity: 'سعة',
    },
    // Common
    common: {
      search: 'بحث...',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      status: 'الحالة',
      active: 'نشطة',
      inactive: 'غير نشطة',
      loading: 'جاري التحميل...',
      language: 'اللغة / Langue',
    },
    // Plans Table
    plans: {
      title: 'إدارة باقات الاشتراك والأسعار (Plans Table)',
      subtitle: 'تخصيص الباقات والأسعار وسعات الـ GB المعروضة للمستخدمين',
      newPlan: 'إضافة باقة جديدة (New Plan)',
      validityDays: 'أيام صلاحية',
      editPlan: 'تعديل بيانات الباقة',
      createPlan: 'إنشاء باقة جديدة',
      planName: 'اسم الباقة (Plan Name)',
      price: 'السعر (بالدرهم)',
      dataCapacity: 'سعة البيانات (GB)',
      validity: 'مدة الصلاحية (بالأيام)',
      operator: 'شبكة الاتصال (Operator)',
      badge: 'شارة التمييز (مثال: الأكثر طلباً)',
      extraInfo: 'معلومات إضافية (المميزات)',
      isActive: 'تفعيل الباقة للمستخدمين',
      saveChanges: 'حفظ التعديلات',
    }
  },
  fr: {
    // Sidebar
    nav: {
      overview: 'Tableau de bord',
      recharges: 'Recharges & Codes',
      subscribers: 'Abonnés & Essais',
      servers: 'Serveurs VPN',
      vpsMonitor: 'Moniteur Ressources VPS',
      profiles: 'Profils (SNI & Payloads)',
      licenses: 'Licences & Vouchers',
      settings: 'Paramètres & Kill-Switch',
      logout: 'Se déconnecter',
      adminPanel: 'Panneau d\'Admin',
      controlModules: 'Modules de Contrôle',
    },
    // Dashboard Overview
    dashboard: {
      title: 'Aperçu du système',
      liveConnections: 'Connexions en direct',
      activeServers: 'Serveurs actifs',
      activeSubscribers: 'Abonnés actifs',
      activeLicenses: 'Licences VIP actives',
      pendingRecharges: 'Recharges en attente',
      networkTraffic: 'Trafic réseau (Aujourd\'hui)',
      quickActions: 'Actions rapides',
      addServer: 'Ajouter Serveur',
      generateCards: 'Générer Cartes',
      appSettings: 'Paramètres App',
      serversOverview: 'État des Serveurs',
      capacity: 'Capacité',
    },
    // Common
    common: {
      search: 'Rechercher...',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      status: 'Statut',
      active: 'Actif',
      inactive: 'Inactif',
      loading: 'Chargement...',
      language: 'اللغة / Langue',
    },
    // Plans Table
    plans: {
      title: 'Gestion des Forfaits & Prix (Plans Table)',
      subtitle: 'Personnaliser les forfaits, prix et capacité GB affichés',
      newPlan: 'Ajouter un Forfait (New Plan)',
      validityDays: 'Jours de validité',
      editPlan: 'Modifier le Forfait',
      createPlan: 'Créer un Forfait',
      planName: 'Nom du Forfait (Plan Name)',
      price: 'Prix (DH)',
      dataCapacity: 'Capacité de Données (GB)',
      validity: 'Durée de validité (Jours)',
      operator: 'Réseau (Opérateur)',
      badge: 'Badge (ex: Plus populaire)',
      extraInfo: 'Infos supplémentaires (Avantages)',
      isActive: 'Activer le forfait pour les utilisateurs',
      saveChanges: 'Enregistrer les modifications',
    }
  }
};

export type Language = 'ar' | 'fr';
export type TranslationKey = keyof typeof translations['ar'];
