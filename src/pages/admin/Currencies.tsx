import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrencies } from '@/features/currencies';
import { useAuth } from '@/features/auth';
import { CurrenciesSkeleton } from '@/components/shared/skeletons/PageSkeletons';
import type { Doc } from '../../../convex/_generated/dataModel';

type Currency = Doc<'currencies'>;

export default function Currencies() {
  const { user } = useAuth();
  const { currencies, isLoading, create, update, remove, toggleActive } = useCurrencies();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    exchangeRate: '',
  });

  const handleAdd = async () => {
    if (!formData.code || !formData.name || !formData.symbol || !formData.exchangeRate || !user?.email) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await create({
        adminEmail: user.email,
        code: formData.code.toUpperCase(),
        name: formData.name,
        symbol: formData.symbol,
        exchangeRate: parseFloat(formData.exchangeRate),
        isActive: true,
      });
      toast.success('Currency added successfully!');
      setIsAddOpen(false);
      setFormData({ code: '', name: '', symbol: '', exchangeRate: '' });
    } catch (error) {
      toast.error('Failed to add currency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCurrency || !user?.email) return;
    setIsSubmitting(true);
    try {
      await update({
        adminEmail: user.email,
        id: selectedCurrency._id,
        name: formData.name,
        symbol: formData.symbol,
        exchangeRate: parseFloat(formData.exchangeRate),
        isActive: selectedCurrency.isActive,
      });
      toast.success('Currency updated successfully!');
      setIsEditOpen(false);
      setSelectedCurrency(null);
    } catch (error) {
      toast.error('Failed to update currency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCurrency || !user?.email) return;
    setIsSubmitting(true);
    try {
      await remove({ adminEmail: user.email, id: selectedCurrency._id });
      toast.success('Currency deleted successfully!');
      setIsDeleteOpen(false);
      setSelectedCurrency(null);
    } catch (error) {
      toast.error('Failed to delete currency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (currency: Currency) => {
    if (!user?.email) return;
    try {
      await toggleActive({ adminEmail: user.email, id: currency._id });
      toast.success('Currency status updated');
    } catch (error) {
      toast.error('Failed to update currency status');
    }
  };

  const openEdit = (currency: Currency) => {
    setSelectedCurrency(currency);
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: currency.exchangeRate.toString(),
    });
    setIsEditOpen(true);
  };

  if (isLoading) {
    return <CurrenciesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Currencies</h1>
          <p className="text-gray-500 mt-1">
            Manage currencies and exchange rates
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Currency
        </Button>
      </div>

      {/* INR Reference */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-blue-900">Base Currency</p>
              <p className="text-sm text-blue-700">
                Indian Rupee (INR) is the base currency. All exchange rates are
                relative to INR.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Currencies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Exchange Rate (to INR)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(currencies || []).map((currency) => (
                  <TableRow key={currency._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold">
                            {currency.symbol}
                          </span>
                        </div>
                        <p className="font-medium">{currency.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {currency.code}
                      </code>
                    </TableCell>
                    <TableCell>{currency.symbol}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          1 {currency.code} = {currency.exchangeRate} INR
                        </span>
                        {currency.exchangeRate > 1 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={currency.isActive}
                          onCheckedChange={() => handleToggleActive(currency)}
                        />
                        <span
                          className={`text-sm ${
                            currency.isActive
                              ? 'text-green-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {currency.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(currency)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {currency.code !== 'INR' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setSelectedCurrency(currency);
                              setIsDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Currency</DialogTitle>
            <DialogDescription>
              Add a new currency with exchange rate relative to INR
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Currency Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., EUR"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., €"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Currency Name</Label>
              <Input
                id="name"
                placeholder="e.g., Euro"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="exchangeRate">Exchange Rate (to INR)</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="0.01"
                placeholder="e.g., 90.5"
                value={formData.exchangeRate}
                onChange={(e) =>
                  setFormData({ ...formData, exchangeRate: e.target.value })
                }
              />
              <p className="text-sm text-gray-500 mt-1">
                How many INR equal 1 unit of this currency
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Adding...' : 'Add Currency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Currency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency Code</Label>
                <Input value={formData.code} disabled />
              </div>
              <div>
                <Label>Symbol</Label>
                <Input
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Currency Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Exchange Rate (to INR)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.exchangeRate}
                onChange={(e) =>
                  setFormData({ ...formData, exchangeRate: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              <Edit className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Currency</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCurrency?.name}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              <Trash2 className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
